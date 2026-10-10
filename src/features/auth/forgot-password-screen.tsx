import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
} from "./auth-shell"

export function ForgotPasswordScreen() {
  const [username, setUsername] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setError("Please enter your username.")
      return
    }

    setError("")
    setSubmitting(true)

    try {
      const res = await api.forgotPassword(cleanUsername)
      setSubmitted(true)
      if (res.resetUrl) {
        setDevResetUrl(res.resetUrl)
      }
      toast.success("Instructions sent if the account exists.")
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to process password reset request."
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCanvas>
      <AuthCard>
        <BackToLogin />
        <h1 className="pt-[21px] text-[17.5px] leading-[24.5px] font-semibold text-[#1a5c3a]">
          Reset password
        </h1>
        <p className="pt-[3.5px] text-[12.25px] leading-[17.5px] text-[#667085]">
          Enter your username and we&apos;ll contact your school administrator.
        </p>

        {submitted ? (
          <div className="pt-[21px]">
            <p className="text-[12.25px] leading-[17.5px] text-[#1b2430]">
              If an account for <span className="font-medium">{username}</span>{" "}
              exists, a reset link has been sent.
            </p>
            {devResetUrl ? (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="mt-3 w-full text-xs"
              >
                <a href={devResetUrl}>Open reset screen</a>
              </Button>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-[21px]">
            <div className="flex flex-col gap-[5.25px] pb-3.5">
              <AuthLabel htmlFor="forgot-username" tone="green">
                Username
              </AuthLabel>
              <input
                id="forgot-username"
                type="text"
                placeholder="Your username"
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

            {error ? (
              <div className="pb-3">
                <AuthError>{error}</AuthError>
              </div>
            ) : null}

            <AuthSubmit disabled={submitting}>
              {submitting ? <Spinner className="size-4 text-white" /> : null}
              Send reset request
            </AuthSubmit>
          </form>
        )}

        <p className="pt-3.5 text-center text-[10.5px] leading-[14px] text-[#667085]">
          Your school administrator will assist you.
        </p>
      </AuthCard>
    </AuthCanvas>
  )
}
