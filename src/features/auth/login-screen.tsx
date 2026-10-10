import { type FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { portalPath, type Role, saveAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

import {
  AuthBrand,
  AuthCanvas,
  AuthCard,
  AuthError,
  authInputClassName,
  AuthLabel,
  AuthSubmit,
  RequiredMark,
} from "./auth-shell"

const PORTALS = [
  { id: "management", label: "Management" },
  { id: "teacher", label: "Teacher" },
  { id: "parent", label: "Parent" },
] as const

type PortalId = (typeof PORTALS)[number]["id"]

const PORTAL_ROLES: Record<PortalId, Role[]> = {
  management: ["super_admin", "operations_manager", "accountant"],
  teacher: ["teacher"],
  parent: ["parent"],
}

export function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from

  const [portal, setPortal] = useState<PortalId>("management")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const portalLabel = PORTALS.find((item) => item.id === portal)?.label

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanUsername = username.trim()
    const cleanPassword = password.trim()

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter both username and password.")
      return
    }

    setError("")
    setSubmitting(true)

    try {
      const res = await api.login(cleanUsername, cleanPassword)
      if (!PORTAL_ROLES[portal].includes(res.user.role)) {
        setError(
          `This account is not in the ${portalLabel} workspace. Choose the matching workspace and try again.`
        )
        return
      }

      saveAuth({ role: res.user.role, token: res.token, user: res.user })
      window.dispatchEvent(new Event("eduvia:auth-changed"))
      toast.success(`Welcome back, ${res.user.firstName} ${res.user.lastName}!`)
      const target =
        redirectTo && redirectTo !== "/login"
          ? redirectTo
          : portalPath(res.user.role)
      navigate(target, { replace: true })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please check your credentials."
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCanvas>
      <AuthBrand />
      <AuthCard>
        <h2 className="text-sm leading-[21px] font-semibold text-[#1b2430]">
          Sign in to your account
        </h2>
        <p className="pt-[3.5px] text-[10.5px] leading-[14px] text-[#667085]">
          Choose your workspace, then enter your credentials.
        </p>

        <div
          className="mt-3.5 grid grid-cols-3 gap-[3.5px] rounded-lg border border-[#e3e8ee] bg-[#f6f8fa] p-[3.5px]"
          role="radiogroup"
          aria-label="Choose portal"
        >
          {PORTALS.map((item) => {
            const selected = portal === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={submitting}
                onClick={() => setPortal(item.id)}
                className={cn(
                  "rounded-md px-[10.5px] py-[7px] text-center text-[10.5px] leading-[14px] font-semibold",
                  selected
                    ? "bg-white text-[#1a5c3a] shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.1)]"
                    : "text-[#667085] hover:text-[#1b2430]"
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="pt-[17.5px]">
          <div className="flex flex-col gap-[5.25px]">
            <AuthLabel htmlFor="login-username">
              Username
              <RequiredMark />
            </AuthLabel>
            <input
              id="login-username"
              type="text"
              placeholder="e.g. tariq.ahmed"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                if (error) setError("")
              }}
              className={authInputClassName}
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="py-3.5">
            <div className="mb-[5.25px] flex items-center justify-between">
              <AuthLabel htmlFor="login-password">
                Password
                <RequiredMark />
              </AuthLabel>
              <Link
                to="/forgot-password"
                className="text-[10.5px] leading-[14px] text-[#1a5c3a] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError("")
              }}
              className={authInputClassName}
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {error ? (
            <div className="pb-3">
              <AuthError>{error}</AuthError>
            </div>
          ) : null}

          <AuthSubmit disabled={submitting}>
            {submitting ? <Spinner className="size-4 text-white" /> : null}
            Sign In to {portalLabel}
          </AuthSubmit>
        </form>
      </AuthCard>
      <p className="pt-[17.5px] text-center text-[11px] leading-[16.5px] text-[#667085]">
        Powered by <span className="font-medium text-[#1a5c3a]">Abler</span>
      </p>
    </AuthCanvas>
  )
}
