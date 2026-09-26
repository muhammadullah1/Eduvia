import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import {
  Bell, BookOpen, Building2, CalendarDays, Check, ClipboardCheck, FileCheck2, GraduationCap,
  Landmark, LayoutDashboard, LibraryBig, LogOut, Menu, MessageSquareText, Moon, Search, ShieldCheck,
  Sparkles, Sun, UserCheck, UserRound, Users, WalletCards,
} from "lucide-react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "@/components/theme-provider"
import { useSchool } from "@/data/store"
import { AcademicSetup, Admissions, Examinations, Fees, Finance, ManagementDashboard, MessagesDesk, People, Reports } from "@/features/management/screens"
import { ParentPortal } from "@/features/parent/screens"
import { TeacherPortal } from "@/features/teacher/screens"
import { clearAuth, defaultSection, loadAuth, portalPath, saveAuth, type Role } from "@/lib/auth"
import { timeAgo } from "@/lib/format"

type Icon = ComponentType<{ className?: string }>

const roles: Record<Role, { label: string; short: string; description: string; user: string; email: string; initials: string; icon: Icon }> = {
  management: { label: "Management Portal", short: "Management", description: "Complete school operations and governance", user: "Ayesha Khan", email: "admin@cls.edu.pk", initials: "AK", icon: Building2 },
  teacher: { label: "Teacher Portal", short: "Teacher", description: "Classes, attendance and academic delivery", user: "Hassan Ali", email: "hassan@cls.edu.pk", initials: "HA", icon: BookOpen },
  parent: { label: "Parent Portal", short: "Parent", description: "A clear view of your child’s school journey", user: "Sara Ahmed", email: "parent@cls.edu.pk", initials: "SA", icon: UserRound },
}

const navigation: Record<Role, { id: string; label: string; icon: Icon }[]> = {
  management: [
    { id: "dashboard", label: "Command center", icon: LayoutDashboard },
    { id: "academic", label: "Academic setup", icon: LibraryBig },
    { id: "admissions", label: "Admissions", icon: Users },
    { id: "people", label: "People", icon: UserRound },
    { id: "exams", label: "Examinations", icon: FileCheck2 },
    { id: "fees", label: "Fees & sync", icon: WalletCards },
    { id: "finance", label: "Finance", icon: Landmark },
    { id: "messages", label: "Communication", icon: MessageSquareText },
    { id: "reports", label: "Reports & audit", icon: ClipboardCheck },
  ],
  teacher: [
    { id: "today", label: "Today", icon: LayoutDashboard },
    { id: "classes", label: "My classes", icon: Users },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "lessons", label: "Lesson progress", icon: BookOpen },
    { id: "updates", label: "Daily updates", icon: MessageSquareText },
    { id: "marks", label: "Marks entry", icon: FileCheck2 },
  ],
  parent: [
    { id: "home", label: "My child", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "results", label: "Results & DMC", icon: GraduationCap },
    { id: "fees", label: "Fees & receipts", icon: WalletCards },
    { id: "timetable", label: "Timetable", icon: CalendarDays },
    { id: "updates", label: "Updates", icon: Bell },
  ],
}

const sectionIds: Record<Role, Set<string>> = {
  management: new Set(navigation.management.map((item) => item.id)),
  teacher: new Set(navigation.teacher.map((item) => item.id)),
  parent: new Set(navigation.parent.map((item) => item.id)),
}

const subtitles: Record<string, string> = {
  dashboard: "A live view of people, learning and school operations.",
  academic: "Sessions, classes, subjects and a conflict-aware timetable.",
  admissions: "Applications, enrollment and the student register.",
  people: "Teachers and office staff behind the school day.",
  exams: "Controlled marks, verification and publishing.",
  fees: "Receipts, outstanding balances and offline synchronisation.",
  finance: "Income, expenses and the operating position.",
  messages: "Approve what families are allowed to see.",
  reports: "Printable insight and a traceable audit history.",
  today: "Your assigned work for a focused, well-run day.",
  classes: "Only the classes allocated to your profile.",
  attendance: "Mark and save attendance for an assigned class.",
  lessons: "What was planned, taught and carried forward.",
  updates: "Draft learning notes for approval and parent visibility.",
  marks: "Enter draft marks, then submit the locked sheet.",
  home: "Everything important about your child, in one place.",
  results: "Published examinations and downloadable report cards.",
  timetable: "The weekly timetable for the selected child.",
}

function isRole(value: string | undefined): value is Role {
  return value === "management" || value === "teacher" || value === "parent"
}

function Logo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl shadow-sm ${inverted ? "bg-white text-[var(--primary-color)]" : "brand-mark text-primary-foreground"}`}><GraduationCap className="size-5" /></div>
      {!compact ? <div className="leading-tight"><p className={`font-heading text-sm font-semibold tracking-tight ${inverted ? "text-white" : ""}`}>Creative Leaders</p><p className={`text-[11px] ${inverted ? "text-[var(--sidebar-inactive)]" : "text-muted-foreground"}`}>School operating system</p></div> : null}
    </div>
  )
}

function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from
  const [role, setRole] = useState<Role>("management")
  const [email, setEmail] = useState(roles.management.email)
  const [password, setPassword] = useState("password")
  const [error, setError] = useState("")
  const [forgot, setForgot] = useState(false)

  function enter(next = role) {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.")
      return
    }
    if (password !== "password") {
      setError("Use the demo password: password")
      return
    }
    setError("")
    saveAuth({ role: next })
    const target = redirectTo && redirectTo !== "/login" ? redirectTo : portalPath(next)
    navigate(target, { replace: true })
  }

  return (
    <main className="login-canvas min-h-svh p-4 md:p-7">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-[1500px] overflow-hidden rounded-[2rem] border bg-card shadow-[0_32px_100px_-42px_rgba(16,38,54,.45)] md:min-h-[calc(100svh-3.5rem)]">
        <section className="relative hidden w-[56%] overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col">
          <div className="school-grid absolute inset-0 opacity-20" />
          <div className="relative z-10 flex items-center gap-3"><Logo /><Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">SRS v2</Badge></div>
          <div className="relative z-10 my-auto max-w-2xl py-16">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-primary-foreground/65 uppercase"><Sparkles className="size-4" /> One connected campus</p>
            <h1 className="font-heading text-5xl leading-[1.05] font-semibold tracking-[-0.045em] xl:text-7xl">Every school day,<br /><span className="text-accent">beautifully organised.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-primary-foreground/70">A complete operating system for management, teachers and parents—from admissions to verified receipts and published report cards.</p>
          </div>
        </section>
        <section className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><Logo /></div>
            <Badge variant="secondary" className="mb-4">Portal access</Badge>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a portal. Demo password is <span className="font-medium text-foreground">password</span>.</p>
            <div className="mt-7 grid gap-2">
              {(Object.keys(roles) as Role[]).map((roleKey) => {
                const item = roles[roleKey]
                const Icon = item.icon
                const selected = role === roleKey
                return (
                  <button key={roleKey} onClick={() => { setRole(roleKey); setEmail(item.email); setError("") }} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/4 shadow-sm ring-2 ring-primary/10" : "hover:border-primary/25 hover:bg-muted/50"}`}>
                    <span className={`grid size-11 place-items-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span></span>
                    <span className={`grid size-5 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selected ? <Check className="size-3" /> : null}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-6 grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="portal-email">Email or user ID</label>
              <Input id="portal-email" aria-invalid={Boolean(error)} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="mt-4 grid gap-1.5">
              <div className="flex items-center justify-between"><label className="text-sm font-medium" htmlFor="portal-password">Password</label><button className="text-xs font-medium text-primary" onClick={() => setForgot(true)}>Forgot password?</button></div>
              <Input id="portal-password" aria-invalid={Boolean(error)} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
            <Button size="lg" className="mt-6 w-full" onClick={() => enter()}>Explore {roles[role].short} portal</Button>
            <p className="mt-5 text-center text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline size-3.5" />Role-based demo · Changes stay in this browser</p>
          </div>
        </section>
      </div>
      <Dialog open={forgot} onOpenChange={setForgot}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>A reset link would be sent to {email || "your school email"}. In this demo, keep using password.</DialogDescription></DialogHeader>
          <DialogFooter><Button onClick={() => { setForgot(false); toast.success("Reset instructions noted for the demo account") }}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const auth = loadAuth()
  if (!auth) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const auth = loadAuth()
  if (auth) return <Navigate to={portalPath(auth.role)} replace />
  return children
}

function HomeRedirect() {
  const auth = loadAuth()
  if (!auth) return <Navigate to="/login" replace />
  return <Navigate to={portalPath(auth.role)} replace />
}

function PortalShell() {
  const { role: roleParam, section: sectionParam } = useParams()
  const navigate = useNavigate()
  const { state, resetDemo } = useSchool()
  const { theme, setTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)

  const roleOk = isRole(roleParam)
  const role: Role = roleOk ? roleParam : "management"
  const sectionValid = Boolean(sectionParam && sectionIds[role].has(sectionParam))
  const section = sectionValid && sectionParam ? sectionParam : defaultSection[role]
  const current = navigation[role].find((item) => item.id === section) ?? navigation[role][0]
  const authRole = loadAuth()?.role

  useEffect(() => {
    if (roleOk && authRole && authRole !== role) saveAuth({ role })
  }, [authRole, role, roleOk])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2 || role === "parent") return []
    const students = state.students.filter((student) => `${student.name} ${student.id}`.toLowerCase().includes(needle)).slice(0, 4).map((student) => ({ id: student.id, label: student.name, hint: student.id, section: role === "teacher" ? "classes" : "admissions" }))
    const payments = role === "management" ? state.payments.filter((payment) => payment.ref.toLowerCase().includes(needle)).slice(0, 3).map((payment) => ({ id: payment.ref, label: payment.ref, hint: "Fee receipt", section: "fees" })) : []
    return [...students, ...payments]
  }, [query, role, state.payments, state.students])

  if (!roleOk) {
    return <Navigate to="/login" replace />
  }
  if (!sectionValid) {
    return <Navigate to={portalPath(role, section)} replace />
  }

  function changeRole(next: Role) {
    saveAuth({ role: next })
    setQuery("")
    setMobileNavOpen(false)
    navigate(portalPath(next))
  }

  function openSection(id: string) {
    setMobileNavOpen(false)
    setNotesOpen(false)
    navigate(portalPath(role, id))
  }

  function logout() {
    clearAuth()
    setMobileNavOpen(false)
    navigate("/login", { replace: true })
  }

  const content = (() => {
    if (role === "teacher") return <TeacherPortal section={section} onOpen={openSection} />
    if (role === "parent") return <ParentPortal section={section} />
    if (section === "academic") return <AcademicSetup />
    if (section === "admissions") return <Admissions query={query} />
    if (section === "people") return <People query={query} />
    if (section === "exams") return <Examinations />
    if (section === "fees") return <Fees query={query} />
    if (section === "finance") return <Finance />
    if (section === "messages") return <MessagesDesk />
    if (section === "reports") return <Reports onReset={() => { resetDemo(); toast.success("Demo data restored") }} />
    return <ManagementDashboard onOpen={openSection} />
  })()

  return (
    <div className="min-h-svh bg-[var(--page-wash)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <Sidebar role={role} active={section} onNavigate={openSection} onRole={changeRole} onLogout={logout} />
      </aside>
      <div className="lg:pl-64">
        <div className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="sr-only"><SheetTitle>Portal navigation</SheetTitle><SheetDescription>Choose a section of the school portal.</SheetDescription></SheetHeader>
              <Sidebar role={role} active={section} onNavigate={openSection} onRole={changeRole} onLogout={logout} />
            </SheetContent>
          </Sheet>
          <Logo />
        </div>
        <header className="sticky top-0 z-20 flex flex-col gap-4 border-b bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground"><span>2026–27</span><span>·</span><span>{roles[role].short}</span></div>
              <h1 className="text-[20px] font-semibold tracking-tight text-[var(--heading)] dark:text-foreground">{current.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitles[section] ?? "Creative Leaders School"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden min-w-64 md:block">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={role === "parent" ? "Search is on each family page" : "Search students or receipts"} className="pl-9" />
                {results.length ? (
                  <div className="absolute top-12 z-30 w-full rounded-xl border bg-popover p-1 shadow-lg">
                    {results.map((item) => (
                      <button key={item.id} className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-muted" onClick={() => { openSection(item.section); setQuery(item.label) }}>
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button variant="outline" size="icon" aria-label="Notifications" onClick={() => setNotesOpen((open) => !open)}><Bell /></Button>
              <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun /> : <Moon />}</Button>
            </div>
          </div>
          {notesOpen ? (
            <div className="rounded-xl border bg-card p-3">
              {state.audits.slice(0, 5).map((event) => <div key={event.id} className="border-b py-2 last:border-0"><p className="text-sm"><span className="font-medium">{event.actor}</span> {event.action}</p><p className="text-xs text-muted-foreground">{timeAgo(event.at)}</p></div>)}
            </div>
          ) : null}
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{content}</main>
      </div>
    </div>
  )
}

function Sidebar({ role, active, onNavigate, onRole, onLogout }: { role: Role; active: string; onNavigate: (id: string) => void; onRole: (role: Role) => void; onLogout: () => void }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
      <div className="px-2 py-3"><Logo inverted /></div>
      <p className="mt-4 px-2 text-[10px] font-semibold tracking-[0.18em] text-[var(--sidebar-inactive)]/80 uppercase">Workspace</p>
      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto">
        {navigation[role].map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${selected ? "bg-white text-[var(--primary-color)] shadow-sm" : "text-[var(--sidebar-inactive)] hover:bg-white/10 hover:text-white"}`}>
              <Icon className="size-4" /><span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-white/15 text-xs font-semibold text-white">{roles[role].initials}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{roles[role].user}</p><p className="truncate text-[11px] text-[var(--sidebar-inactive)]">{roles[role].label}</p></div>
          <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" aria-label="Sign out" onClick={onLogout}><LogOut /></Button>
        </div>
        <Select value={role} onValueChange={(value) => onRole(value as Role)}>
          <SelectTrigger className="mt-3 h-10 w-full border-white/20 bg-white/10 text-xs text-white"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>{(Object.keys(roles) as Role[]).map((item) => <SelectItem key={item} value={item}>{roles[item].short} demo</SelectItem>)}</SelectGroup></SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="mt-2 w-full text-[var(--sidebar-inactive)] hover:bg-white/10 hover:text-white" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light theme" : "Dark theme"}</Button>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginScreen /></GuestOnly>} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/:role/:section/*"
        element={
          <RequireAuth>
            <PortalShell />
          </RequireAuth>
        }
      />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export function Portal() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
