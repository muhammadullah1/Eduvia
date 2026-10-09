import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
} from "lucide-react"
import { type FormEvent, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError("Please enter your registered email address.")
      return
    }

    setError("")
    setSubmitting(true)

    try {
      const res = await api.forgotPassword(cleanEmail)
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
    <main className="login-canvas flex min-h-svh items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="brand-mark mb-3 grid size-12 place-items-center rounded-2xl text-primary-foreground shadow-md">
            <KeyRound className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Reset Password
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Creative Leaders School Management Portal
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center rounded-xl border border-border/80 bg-muted/40 p-5 text-center">
              <CheckCircle2 className="mb-2 size-10 text-emerald-500" />
              <h3 className="text-base font-semibold text-foreground">
                Check your email
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                If an account with{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                exists, we have sent a link to reset your password.
              </p>
            </div>

            {devResetUrl ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <p className="font-semibold text-primary">
                  Development Mode Link Preview:
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Since Resend email simulation is active, you can open the
                  reset link directly:
                </p>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full text-xs"
                  >
                    <a href={devResetUrl}>Open Reset Screen</a>
                  </Button>
                </div>
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 size-4" /> Back to sign in
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter your email address below. If your account exists, we will
              send you a secure link to choose a new password.
            </p>

            <div className="grid gap-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@cls.edu.pk"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (error) setError("")
                  }}
                  className="pl-9 text-sm"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full text-sm font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner className="mr-2 size-4" /> Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
