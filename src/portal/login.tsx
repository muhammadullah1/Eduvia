import { useState, type FormEvent } from "react"
import {
  ArrowRight,
  Check,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatPercent } from "@/lib/format"
import { todayAttendanceRate, rollup } from "@/lib/selectors"
import { useSchool } from "@/lib/school-context"
import type { Role } from "@/types"

import { roles } from "@/portal/roles"

const DEMO_PASSWORD = "password"

function defaultEmail(role: Role) {
  if (role === "parent") return "parent@cls.edu.pk"
  if (role === "teacher") return "hassan@cls.edu.pk"
  return "admin@cls.edu.pk"
}

export function LoginScreen({ onEnter }: { onEnter: (role: Role) => void }) {
  const { state } = useSchool()
  const figures = rollup(state)
  const attendance = todayAttendanceRate(state)
  const [role, setRole] = useState<Role>("management")
  const [email, setEmail] = useState(defaultEmail("management"))
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = (next: Role) => {
    setRole(next)
    setEmail(defaultEmail(next))
    setError(null)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setError("Enter the email or user ID for this portal.")
      return
    }
    if (password !== DEMO_PASSWORD) {
      setError("That password is not valid. Every demo role uses password.")
      return
    }
    setError(null)
    onEnter(role)
  }

  return (
    <main className="login-canvas min-h-svh p-4 md:p-7">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-[1500px] overflow-hidden rounded-[2rem] border bg-card shadow-[0_32px_100px_-42px_rgba(16,38,54,.45)] md:min-h-[calc(100svh-3.5rem)]">
        <section className="relative hidden w-[56%] overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col">
          <div className="school-grid absolute inset-0 opacity-20" />
          <div className="relative z-10 flex items-center gap-3">
            <Logo />
            <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
              SRS v2
            </Badge>
          </div>
          <div className="relative z-10 my-auto max-w-2xl py-16">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-primary-foreground/65 uppercase">
              <Sparkles className="size-4" /> One connected campus
            </p>
            <h1 className="font-heading text-5xl leading-[1.05] font-semibold tracking-[-0.045em] xl:text-7xl">
              Every school day,
              <br />
              <span className="text-accent">beautifully organised.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-primary-foreground/70">
              A complete operating system for management, teachers and
              parents—from admissions to verified receipts and published report
              cards.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              [
                figures.activeStudents.toLocaleString("en-PK"),
                "active students",
              ],
              [formatPercent(attendance.rate), "tracked attendance"],
              ["1 session", "shared across roles"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/[0.06] p-4 backdrop-blur"
              >
                <p className="font-heading text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-primary-foreground/55">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-14">
          <form className="w-full max-w-md" onSubmit={submit}>
            <div className="mb-10 lg:hidden">
              <Logo />
            </div>
            <Badge variant="secondary" className="mb-4">
              Portal access
            </Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose a portal. The demo password for every role is password.
            </p>
            <div className="mt-7 grid gap-2">
              {(Object.keys(roles) as Role[]).map((roleKey) => {
                const item = roles[roleKey]
                const Icon = item.icon
                const selected = role === roleKey
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => choose(roleKey)}
                    className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/[0.04] shadow-sm ring-2 ring-primary/10" : "hover:border-primary/25 hover:bg-muted/50"}`}
                  >
                    <span
                      className={`grid size-11 place-items-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <span
                      className={`grid size-5 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-6 grid gap-2">
              <label className="text-xs font-medium" htmlFor="portal-email">
                Email or user ID
              </label>
              <Input
                id="portal-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                aria-invalid={error?.includes("email") || undefined}
              />
            </div>
            <div className="mt-4 grid gap-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium"
                  htmlFor="portal-password"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary"
                  onClick={() =>
                    toast.message("Demo access", {
                      description:
                        "Use the password password for Management, Teacher, and Parent.",
                    })
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  id="portal-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  aria-invalid={
                    Boolean(error && !error.includes("email")) || undefined
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            {error ? (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            ) : null}
            <Button size="lg" className="mt-6 w-full" type="submit">
              Explore {roles[role].short} portal{" "}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline size-3.5" />
              One shared school session · switch roles without losing changes
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark grid size-10 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-sm">
        <GraduationCap className="size-5" />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <p className="font-heading text-sm font-semibold tracking-tight">
            Creative Leaders
          </p>
          <p className="text-[11px] text-muted-foreground">
            School operating system
          </p>
        </div>
      ) : null}
    </div>
  )
}
