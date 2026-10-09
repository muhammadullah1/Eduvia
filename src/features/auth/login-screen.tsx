import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react"
import { type FormEvent, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { portalPath, saveAuth } from "@/lib/auth"

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
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
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

        <p className="mt-6 flex items-center justify-center border-t pt-4 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="mr-1 inline size-3.5" />
          Secure school session
        </p>
      </div>
    </main>
  )
}
