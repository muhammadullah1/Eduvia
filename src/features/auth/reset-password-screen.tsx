import { type FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"

import {
  AuthCanvas,
  AuthCard,
  AuthError,
  authInputClassName,
  AuthLabel,
  AuthSubmit,
  BackToLogin,
  RequiredMark,
} from "./auth-shell"

type TokenValidation =
  | { status: "verifying" }
  | { status: "invalid"; message: string }
  | {
      status: "valid"
      data: {
        email: string
        name: string
        role: string
        purpose: string
      }
    }
  | { status: "success" }

export function ResetPasswordScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token") || ""

  const [validation, setValidation] = useState<TokenValidation>(() => {
    if (!token) {
      return {
        status: "invalid",
        message:
          "Missing security token in link. Please use the complete link provided.",
      }
    }
    return { status: "verifying" }
  })
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const creating =
    validation.status === "valid" && validation.data.purpose === "invitation"

  useEffect(() => {
    if (!token) return

    let active = true

    async function checkToken() {
      try {
        const res = await api.verifyResetToken(token)
        if (active) {
          setValidation({
            status: "valid",
            data: {
              email: res.email,
              name: res.name,
              role: res.role,
              purpose: res.purpose,
            },
          })
        }
      } catch (err) {
        if (active) {
          const msg =
            err instanceof Error
              ? err.message
              : "This link is invalid or has expired. Please request a new one."
          setValidation({ status: "invalid", message: msg })
        }
      }
    }

    checkToken()

    return () => {
      active = false
    }
  }, [token])

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.")
      return
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.")
      return
    }

    setFormError("")
    setSubmitting(true)

    try {
      await api.resetPassword(token, password)
      setValidation({ status: "success" })
      toast.success("Password updated successfully!")
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update password."
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const title = creating ? "Create new password" : "Update password"
  const description = creating
    ? "Choose a password for your account."
    : "Choose a new password for your account."

  return (
    <AuthCanvas>
      <AuthCard>
        <BackToLogin />

        {validation.status === "verifying" && (
          <div className="flex flex-col items-center py-8 text-center">
            <Spinner className="size-5 text-[#1a5c3a]" />
            <p className="mt-4 text-[12.25px] font-medium text-[#1b2430]">
              Verifying security link...
            </p>
          </div>
        )}

        {validation.status === "invalid" && (
          <div className="pt-[21px]">
            <h1 className="text-[17.5px] leading-[24.5px] font-semibold text-[#1a5c3a]">
              Link unavailable
            </h1>
            <p className="pt-[3.5px] text-[12.25px] leading-[17.5px] text-[#667085]">
              {validation.message}
            </p>
            <Link
              to="/forgot-password"
              className="mt-[21px] flex h-[38px] w-full items-center justify-center rounded-lg border border-[#1a5c3a] bg-[#1a5c3a] text-[12.25px] font-medium text-white hover:bg-[#144a2f]"
            >
              Request a new link
            </Link>
          </div>
        )}

        {validation.status === "success" && (
          <div className="pt-[21px]">
            <h1 className="text-[17.5px] leading-[24.5px] font-semibold text-[#1a5c3a]">
              Password updated
            </h1>
            <p className="pt-[3.5px] text-[12.25px] leading-[17.5px] text-[#667085]">
              Your password has been set. You can now sign in to your portal.
            </p>
            <button
              type="button"
              className="mt-[21px] flex h-[38px] w-full items-center justify-center rounded-lg border border-[#1a5c3a] bg-[#1a5c3a] text-[12.25px] font-medium text-white hover:bg-[#144a2f]"
              onClick={() => navigate("/login", { replace: true })}
            >
              Back to login
            </button>
          </div>
        )}

        {validation.status === "valid" && (
          <>
            <h1 className="pt-[21px] text-[17.5px] leading-[24.5px] font-semibold text-[#1a5c3a]">
              {title}
            </h1>
            <p className="pt-[3.5px] text-[12.25px] leading-[17.5px] text-[#667085]">
              {description}
            </p>
            <p className="pt-2 text-[10.5px] leading-[14px] text-[#667085]">
              {validation.data.name} · {validation.data.email}
            </p>

            <form onSubmit={handleResetSubmit} className="pt-[21px]">
              <div className="flex flex-col gap-[5.25px]">
                <AuthLabel htmlFor="reset-new-password" tone="green">
                  New password
                  <RequiredMark />
                </AuthLabel>
                <input
                  id="reset-new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (formError) setFormError("")
                  }}
                  className={authInputClassName}
                  autoComplete="new-password"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-[5.25px] py-3.5">
                <AuthLabel htmlFor="reset-confirm-password" tone="green">
                  Confirm password
                  <RequiredMark />
                </AuthLabel>
                <input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    if (formError) setFormError("")
                  }}
                  className={authInputClassName}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>

              {formError ? (
                <div className="pb-3">
                  <AuthError>{formError}</AuthError>
                </div>
              ) : null}

              <AuthSubmit disabled={submitting}>
                {submitting ? <Spinner className="size-4 text-white" /> : null}
                {creating ? "Create password" : "Update password"}
              </AuthSubmit>
            </form>
          </>
        )}

        <p className="pt-3.5 text-center text-[10.5px] leading-[14px] text-[#667085]">
          Your school administrator will assist you.
        </p>
      </AuthCard>
    </AuthCanvas>
  )
}
