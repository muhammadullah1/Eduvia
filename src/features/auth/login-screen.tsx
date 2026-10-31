import { CalendarCheck, Eye, EyeOff, GraduationCap, Wallet } from "lucide-react"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import clsCrest from "@/assets/cls-crest.png"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { ALL_ROLES, portalPath, type Role, saveAuth } from "@/lib/auth"
import { SESSION_EXPIRED_MESSAGE, takeReturnTo } from "@/lib/session-expiry"
import { cn } from "@/lib/utils"

import {
  AuthBrand,
  AuthCard,
  authInputClassName,
  AuthLabel,
  AuthPoweredBy,
  AuthSubmit,
  RequiredMark,
} from "./auth-shell"
import {
  LOGIN_MESSAGES,
  loginErrorMessage,
  type LoginField,
  type SchoolChoice,
  schoolChoices,
  validateLogin,
} from "./login-errors"

const LOGIN_TOAST_ID = "login-error"
const LOGIN_PATH = "/login"

const BRAND_POINTS = [
  { icon: CalendarCheck, text: "Attendance, timetables and leave in one place" },
  { icon: Wallet, text: "Fee collection with instant receipts" },
  { icon: GraduationCap, text: "Exams, mark sheets and results for every class" },
]

type RouteState = { from?: string; expired: boolean }

function readRouteState(state: unknown): RouteState {
  if (typeof state !== "object" || state === null) return { expired: false }
  const expired = "expired" in state && state.expired === true
  if ("from" in state && typeof state.from === "string") return { from: state.from, expired }
  return { expired }
}

const PASSWORD_SHOWN = { type: "text", label: "Hide password", Icon: EyeOff }
const PASSWORD_HIDDEN = { type: "password", label: "Show password", Icon: Eye }

function passwordView(visible: boolean) {
  if (visible) return PASSWORD_SHOWN
  return PASSWORD_HIDDEN
}

function isPortalRole(role: string): role is Role {
  return ALL_ROLES.some((portalRole) => portalRole === role)
}

const fieldErrorClassName = "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"

function LoginBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[var(--primary-color)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/5" />
      <div className="relative flex items-center gap-3">
        <img src={clsCrest} alt="" className="size-12 rounded-lg bg-white object-contain p-1" />
        <div>
          <p className="text-base font-semibold">Creative Leaders Schools</p>
          <p className="text-sm text-white/75">School Management System</p>
        </div>
      </div>
      <div className="relative max-w-md">
        <h2 className="text-3xl leading-tight font-semibold">Everything your school runs on, in one portal.</h2>
        <ul className="mt-8 flex flex-col gap-4">
          {BRAND_POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-white/90">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon className="size-4" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-white/70">
        Powered by <span className="font-medium text-white">Abler</span>
      </p>
    </aside>
  )
}

export function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = readRouteState(location.state)
  const sessionExpired = routeState.expired
  const [redirectTo] = useState(() => routeState.from ?? takeReturnTo() ?? undefined)

  useEffect(() => {
    if (sessionExpired) toast.info(SESSION_EXPIRED_MESSAGE, { id: "session-expired" })
  }, [sessionExpired])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [schoolId, setSchoolId] = useState("")
  const [schools, setSchools] = useState<SchoolChoice[]>([])
  const [invalidField, setInvalidField] = useState<LoginField | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  function showError(message: string) {
    toast.error(message, { id: LOGIN_TOAST_ID })
  }

  function landingPath(role: Role) {
    if (redirectTo && redirectTo !== LOGIN_PATH) return redirectTo
    return portalPath(role)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return

    const cleanEmail = email.trim()
    const problem = validateLogin(cleanEmail, password)
    if (problem) {
      setInvalidField(problem.field)
      showError(problem.message)
      return
    }

    setInvalidField(null)
    inFlight.current = true
    setSubmitting(true)

    try {
      const selectedSchool = Number(schoolId) || undefined
      const res = await api.login(cleanEmail, password, selectedSchool)
      if (!isPortalRole(res.user.role)) {
        showError(LOGIN_MESSAGES.wrongPortal)
        return
      }

      saveAuth({
        role: res.user.role,
        token: res.token,
        user: res.user,
        permissions: res.permissions,
      })
      window.dispatchEvent(new Event("eduvia:auth-changed"))
      toast.dismiss(LOGIN_TOAST_ID)
      toast.success(`Welcome back, ${res.user.firstName} ${res.user.lastName}!`)
      navigate(landingPath(res.user.role), { replace: true })
    } catch (err) {
      const choices = schoolChoices(err)
      const [firstSchool] = choices
      if (firstSchool) {
        setSchools(choices)
        setSchoolId(String(firstSchool.id))
        toast.info(LOGIN_MESSAGES.chooseSchool, { id: LOGIN_TOAST_ID })
        return
      }
      showError(loginErrorMessage(err))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const passwordToggle = passwordView(showPassword)

  return (
    <main className="login-canvas grid min-h-svh w-full overflow-x-hidden lg:grid-cols-2">
      <LoginBrandPanel />
      <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden">
            <AuthBrand />
          </div>
          <AuthCard className="md:px-8 md:py-9">
            <h2 className="text-lg leading-7 font-semibold text-[#0F172A]">Welcome back</h2>
            <p className="mt-1 text-sm leading-5 text-[#64748B]">
              Sign in with your school email to open your portal.
            </p>

            {sessionExpired && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                {SESSION_EXPIRED_MESSAGE}
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <AuthLabel htmlFor="login-email">
                  Email
                  <RequiredMark />
                </AuthLabel>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  placeholder="you@school.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (invalidField === "email") setInvalidField(null)
                  }}
                  className={cn(authInputClassName, invalidField === "email" && fieldErrorClassName)}
                  autoComplete="email"
                  autoFocus
                  aria-invalid={invalidField === "email"}
                  disabled={submitting}
                />
              </div>

              {schools.length > 0 && (
                <div className="flex flex-col gap-2">
                  <AuthLabel htmlFor="login-school">
                    School
                    <RequiredMark />
                  </AuthLabel>
                  <Select value={schoolId || undefined} onValueChange={setSchoolId} disabled={submitting}>
                    <SelectTrigger id="login-school" className={authInputClassName}>
                      <SelectValue placeholder="Choose your school" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={String(school.id)}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <AuthLabel htmlFor="login-password">
                    Password
                    <RequiredMark />
                  </AuthLabel>
                  <Link
                    to="/forgot-password"
                    className="rounded text-xs leading-4 font-medium text-[var(--primary-color)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:outline-none"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={passwordToggle.type}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (invalidField === "password") setInvalidField(null)
                    }}
                    className={cn(authInputClassName, "pr-11", invalidField === "password" && fieldErrorClassName)}
                    autoComplete="current-password"
                    aria-invalid={invalidField === "password"}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={passwordToggle.label}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                    disabled={submitting}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[#64748B] transition-colors hover:text-[#0F172A] focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <passwordToggle.Icon className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <AuthSubmit disabled={submitting} className="mt-1 md:h-11">
                {submitting && <Spinner className="size-4 text-white" aria-hidden />}
                {submitting && "Signing in…"}
                {!submitting && "Sign In"}
              </AuthSubmit>
            </form>
          </AuthCard>
          <div className="lg:hidden">
            <AuthPoweredBy />
          </div>
        </div>
      </section>
    </main>
  )
}
