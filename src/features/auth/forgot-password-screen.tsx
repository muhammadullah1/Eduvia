import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"

import {
  AuthBrand,
  AuthCanvas,
  AuthCard,
  AuthError,
  AuthFooterNote,
  AuthHeading,
  authInputClassName,
  AuthLabel,
  AuthPoweredBy,
  AuthPrimaryLink,
  AuthSubmit,
  BackToLogin,
  RequiredMark,
} from "./auth-shell"

export function ForgotPasswordScreen() {
  const [username, setUsername] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

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
      await api.forgotPassword(cleanUsername)
      setSubmitted(true)
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
      <AuthBrand />
      <AuthCard>
        <BackToLogin />

        <AuthHeading
          title="Reset password"
          description="Enter your username and we'll contact your school administrator."
        />

        {submitted ? (
          <div className="pt-[17.5px] md:pt-8">
            <p className="text-[12.25px] leading-[17.5px] text-[#1b2430] md:text-[13px] md:leading-5">
              If an account for <span className="font-medium">{username}</span>{" "}
              exists, a reset link has been sent.
            </p>
            <div className="pt-5 md:pt-6">
              <AuthPrimaryLink to="/login">Back to login</AuthPrimaryLink>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-[17.5px] md:pt-8">
            <div className="flex flex-col gap-[5.25px] md:gap-2">
              <AuthLabel htmlFor="forgot-username">
                Username
                <RequiredMark />
              </AuthLabel>
              <input
                id="forgot-username"
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

            {error ? (
              <div className="pb-3 pt-3 md:pb-4 md:pt-4">
                <AuthError>{error}</AuthError>
              </div>
            ) : null}

            <AuthSubmit disabled={submitting} className="mt-3 md:mt-4">
              {submitting ? <Spinner className="size-4 text-white" /> : null}
              Send reset request
            </AuthSubmit>
          </form>
        )}

        <AuthFooterNote>
          Your school administrator will assist you.
        </AuthFooterNote>
      </AuthCard>
      <AuthPoweredBy />
    </AuthCanvas>
  )
}
