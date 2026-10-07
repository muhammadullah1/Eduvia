import { useEffect, useState, type FormEvent } from "react"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { portalPath, saveAuth, type Role } from "@/lib/auth"

const DEMO_ACCOUNTS: { label: string; email: string; role: Role }[] = [
  { label: "Super Admin", email: "admin@cls.edu.pk", role: "super_admin" },
  { label: "Operations", email: "operations@cls.edu.pk", role: "operations_manager" },
  { label: "Accountant", email: "accountant@cls.edu.pk", role: "accountant" },
  { label: "Teacher", email: "hassan@cls.edu.pk", role: "teacher" },
  { label: "Parent", email: "parent@cls.edu.pk", role: "parent" },
]

export function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter both email address and password.")
      return
    }

    setError("")
    setSubmitting(true)

    try {
      const res = await api.login(cleanEmail, cleanPassword)
      saveAuth({ role: res.user.role, token: res.token, user: res.user })
      window.dispatchEvent(new Event("eduvia:auth-changed"))
      toast.success(`Welcome back, ${res.user.firstName} ${res.user.lastName}!`)
      const target = redirectTo && redirectTo !== "/login" ? redirectTo : portalPath(res.user.role)
      navigate(target, { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed. Please check your credentials."
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
            <GraduationCap className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Creative Leaders School
          </h1>
          <p className="mt-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Eduvia Operating System
          </p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your credentials to access your portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="login-email" className="text-xs font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
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

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs font-medium">
                Password
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (error) setError("")
                }}
                className="pr-9 pl-9 text-sm"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
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
                <Spinner className="mr-2 size-4" /> Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-6 border-t pt-4">
          <p className="mb-2.5 text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Quick demo credentials
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => {
                  setEmail(account.email)
                  setPassword("Creative@2026")
                  setError("")
                }}
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {account.label}
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="mr-1 inline size-3.5" />
            Dynamic role routing · Secure session
          </p>
        </div>
      </div>
    </main>
  )
}

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
      const msg = err instanceof Error ? err.message : "Unable to process password reset request."
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
              <h3 className="text-base font-semibold text-foreground">Check your email</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                If an account with{" "}
                <span className="font-medium text-foreground">{email}</span> exists, we have sent a link to reset your password.
              </p>
            </div>

            {devResetUrl ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <p className="font-semibold text-primary">Development Mode Link Preview:</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Since Resend email simulation is active, you can open the reset link directly:
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" asChild className="w-full text-xs">
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
              Enter your email address below. If your account exists, we will send you a secure link to choose a new password.
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
        message: "Missing security token in link. Please use the complete link provided.",
      }
    }
    return { status: "verifying" }
  })
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

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
      const msg = err instanceof Error ? err.message : "Failed to update password."
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-canvas flex min-h-svh items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="brand-mark mb-3 grid size-12 place-items-center rounded-2xl text-primary-foreground shadow-md">
            <Lock className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {validation.status === "valid" && validation.data.purpose === "invitation"
              ? "Activate Account"
              : "Set Password"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Creative Leaders School Management Portal
          </p>
        </div>

        {validation.status === "verifying" && (
          <div className="flex flex-col items-center py-8 text-center">
            <Spinner className="size-8 text-primary" />
            <p className="mt-4 text-sm font-medium text-foreground">
              Verifying security link...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please wait while we validate your credentials.
            </p>
          </div>
        )}

        {validation.status === "invalid" && (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center rounded-xl border border-destructive/20 bg-destructive/10 p-5">
              <AlertCircle className="mb-2 size-10 text-destructive" />
              <h3 className="text-base font-semibold text-destructive">Link Invalid or Expired</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {validation.message}
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request a New Link</Link>
            </Button>
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </div>
          </div>
        )}

        {validation.status === "success" && (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <CheckCircle2 className="mb-2 size-10 text-emerald-600" />
              <h3 className="text-base font-semibold text-foreground">Password Updated!</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Your password has been set successfully. You can now log in to your portal.
              </p>
            </div>
            <Button
              className="w-full font-semibold"
              onClick={() => navigate("/login", { replace: true })}
            >
              Sign In to Your Portal
            </Button>
          </div>
        )}

        {validation.status === "valid" && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-foreground">{validation.data.name}</p>
              <p className="text-muted-foreground">{validation.data.email}</p>
              <div className="mt-1.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary capitalize">
                {validation.data.role.replace(/_/g, " ")}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="reset-new-password" className="text-xs font-medium">
                New password
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (formError) setFormError("")
                  }}
                  className="pr-9 pl-9 text-sm"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="reset-confirm-password" className="text-xs font-medium">
                Confirm new password
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    if (formError) setFormError("")
                  }}
                  className="pr-9 pl-9 text-sm"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {formError ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
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
                  <Spinner className="mr-2 size-4" /> Saving password...
                </>
              ) : validation.data.purpose === "invitation" ? (
                "Activate Account & Continue"
              ) : (
                "Reset Password"
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
