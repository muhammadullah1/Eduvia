import { type FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { ALL_ROLES, portalPath, saveAuth, type Role } from "@/lib/auth"

import {
  AuthBrand,
  AuthCanvas,
  AuthCard,
  AuthError,
  authInputClassName,
  AuthLabel,
  AuthPoweredBy,
  AuthSubmit,
  RequiredMark,
} from "./auth-shell"

function isPortalRole(role: string): role is Role {
  return (ALL_ROLES as string[]).includes(role)
}

export function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

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
      if (!isPortalRole(res.user.role)) {
        setError("This account cannot sign in to the school portal.")
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
        <h2 className="text-sm leading-[21px] font-semibold text-[#1b2430] md:text-[15px] md:leading-[22px]">
          Sign in to your account
        </h2>
        <p className="pt-[3.5px] text-[10.5px] leading-[14px] text-[#667085] md:pt-2 md:text-xs md:leading-[18px]">
          Enter your credentials to open your portal.
        </p>

        <form onSubmit={handleSubmit} className="pt-[17.5px] md:pt-8">
          <div className="flex flex-col gap-[5.25px] md:gap-2">
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

          <div className="py-3.5 md:py-6">
            <div className="mb-[5.25px] flex items-center justify-between md:mb-2">
              <AuthLabel htmlFor="login-password">
                Password
                <RequiredMark />
              </AuthLabel>
              <Link
                to="/forgot-password"
                className="text-[10.5px] leading-[14px] text-[#1a5c3a] hover:underline md:text-xs md:leading-4"
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
            <div className="pb-3 md:pb-4">
              <AuthError>{error}</AuthError>
            </div>
          ) : null}

          <div className="md:pt-1">
            <AuthSubmit disabled={submitting}>
            {submitting ? <Spinner className="size-4 text-white" /> : null}
            Sign In
            </AuthSubmit>
          </div>
        </form>
      </AuthCard>
      <AuthPoweredBy />
    </AuthCanvas>
  )
}
