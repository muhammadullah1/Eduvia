import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react"
import {
  Bell, BookOpen, Building2, Calculator, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList, FileCheck2, GraduationCap,
  Landmark, LayoutDashboard, LibraryBig, LogOut, Menu, MessageSquareText, Moon, ReceiptText, Search, Settings2, ShieldAlert, ShieldCheck,
  Sun, UserCheck, UserRound, Users, WalletCards,
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "@/components/theme-provider"
import { useSchool } from "@/data/store"
import { AcademicSetup, Admissions, Examinations, Fees, Finance, ManagementDashboard, MessagesDesk, People, Reports } from "@/features/management/screens"
import { AccountantPortal, AbsencesPanel, CurriculumPanel, LessonReviewPanel, OperationsOverview, ResultsGatePanel, SettingsPanel, WeeklyTestsPanel } from "@/features/ops/screens"
import { ParentPortal } from "@/features/parent/screens"
import { TeacherPortal } from "@/features/teacher/screens"
import { ForgotPasswordScreen, LoginScreen, ResetPasswordScreen } from "@/features/auth/screens"
import { DEMO_USERS } from "@/lib/actor"
import { ALL_ROLES, clearAuth, defaultSection, loadAuth, portalPath, roleFromSlug, saveAuth, type Role } from "@/lib/auth"
import { timeAgo } from "@/lib/format"
import { api } from "@/lib/api"
import { can } from "@/lib/permissions"

type Icon = ComponentType<{ className?: string }>

const roles: Record<Role, { label: string; short: string; description: string; user: string; email: string; initials: string; icon: Icon }> = {
  super_admin: { label: "Super Admin Portal", short: "Super Admin", description: "Full control, including overall fee totals", user: DEMO_USERS.super_admin, email: "admin@cls.edu.pk", initials: "AK", icon: Building2 },
  operations_manager: { label: "Operations Portal", short: "Operations Manager", description: "Academics, people, absences and results — no fee totals", user: DEMO_USERS.operations_manager, email: "operations@cls.edu.pk", initials: "IS", icon: ShieldCheck },
  accountant: { label: "Accountant Portal", short: "Accountant", description: "Record payments and print your daily receipts", user: DEMO_USERS.accountant, email: "accountant@cls.edu.pk", initials: "NI", icon: Calculator },
  teacher: { label: "Teacher Portal", short: "Teacher", description: "Classes, attendance and academic delivery", user: DEMO_USERS.teacher, email: "hassan@cls.edu.pk", initials: "HA", icon: BookOpen },
  parent: { label: "Parent Portal", short: "Parent", description: "A clear view of your child’s school journey", user: DEMO_USERS.parent, email: "parent@cls.edu.pk", initials: "SA", icon: UserRound },
}

/** Shared by the super admin and the operations manager; fee sections are super-admin only. */
const managementNav: { id: string; label: string; icon: Icon }[] = [
  { id: "academic", label: "Academic setup", icon: LibraryBig },
  { id: "curriculum", label: "Planned chapters", icon: BookOpen },
  { id: "lesson-review", label: "Lesson review", icon: ClipboardCheck },
  { id: "admissions", label: "Admissions", icon: Users },
  { id: "people", label: "People", icon: UserRound },
  { id: "absences", label: "Absences & cover", icon: CalendarClock },
  { id: "weekly-tests", label: "Weekly tests", icon: ClipboardList },
  { id: "exams", label: "Examinations", icon: FileCheck2 },
  { id: "results-gate", label: "Result visibility", icon: ShieldAlert },
  { id: "messages", label: "Communication", icon: MessageSquareText },
]

const navigation: Record<Role, { id: string; label: string; icon: Icon }[]> = {
  super_admin: [
    { id: "dashboard", label: "Command center", icon: LayoutDashboard },
    ...managementNav,
    { id: "fees", label: "Fees & sync", icon: WalletCards },
    { id: "finance", label: "Finance", icon: Landmark },
    { id: "settings", label: "Settings", icon: Settings2 },
    { id: "reports", label: "Reports & audit", icon: ClipboardCheck },
  ],
  operations_manager: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    ...managementNav,
    { id: "settings", label: "Academic rules", icon: Settings2 },
    { id: "reports", label: "Reports & audit", icon: ClipboardCheck },
  ],
  accountant: [
    { id: "collect", label: "Record payment", icon: WalletCards },
    { id: "collections", label: "My daily receipts", icon: ReceiptText },
  ],
  teacher: [
    { id: "today", label: "Today", icon: LayoutDashboard },
    { id: "classes", label: "My classes", icon: Users },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "daily-update", label: "Daily update", icon: BookOpen },
    { id: "weekly-tests", label: "Weekly tests", icon: ClipboardList },
    { id: "notices", label: "Class notices", icon: MessageSquareText },
    { id: "marks", label: "Marks entry", icon: FileCheck2 },
  ],
  parent: [
    { id: "home", label: "My child", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "results", label: "Results & DMC", icon: GraduationCap },
    { id: "tests", label: "Weekly tests", icon: ClipboardList },
    { id: "fees", label: "Fees & receipts", icon: WalletCards },
    { id: "timetable", label: "Timetable", icon: CalendarDays },
    { id: "updates", label: "Updates", icon: Bell },
  ],
}

const sectionIds = Object.fromEntries(ALL_ROLES.map((role) => [role, new Set(navigation[role].map((item) => item.id))])) as Record<Role, Set<string>>

const subtitles: Record<string, string> = {
  dashboard: "A live view of people, learning, fees and school operations.",
  overview: "Today’s academic operations — cover, reviews, tests and results.",
  academic: "Sessions, classes, subjects and a conflict-aware timetable.",
  curriculum: "Plan the chapters teachers select in their daily updates.",
  "lesson-review": "Approve daily updates before parents can see them.",
  admissions: "Applications, enrollment and the student register.",
  people: "Teachers and office staff; one active subject per teacher.",
  absences: "Mark teachers absent by period and assign a free substitute.",
  "weekly-tests": "One test day per subject, marks, publishing and monthly outcomes.",
  exams: "Controlled marks, verification and publishing.",
  "results-gate": "Published results, the fee rule at view time and audited overrides.",
  fees: "Receipts, monthly fee status and offline synchronisation.",
  finance: "Income, expenses and the operating position.",
  messages: "Approve what families are allowed to see.",
  settings: "Configurable pass criteria and the result fee rule.",
  reports: "Printable insight and a traceable audit history.",
  collect: "Record a payment; it clears the oldest unpaid month first.",
  collections: "Only the receipts you recorded, day by day.",
  today: "Your timetable for today, including substitute duties.",
  classes: "Only the classes allocated to your profile.",
  attendance: "Mark and save attendance for an assigned class.",
  "daily-update": "Pick today’s planned chapter and send it for review.",
  notices: "Draft class notices for approval and parent visibility.",
  marks: "Enter draft marks, then submit the locked sheet.",
  home: "Everything important about your child, in one place.",
  results: "Published examinations and downloadable report cards.",
  tests: "Published weekly test marks and the monthly outcome.",
  timetable: "The weekly timetable for the selected child.",
  updates: "Approved lesson updates and school notices.",
}

function Logo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl shadow-sm ${inverted ? "bg-white text-[var(--primary-color)]" : "brand-mark text-primary-foreground"}`}><GraduationCap className="size-5" /></div>
      {!compact ? <div className="leading-tight"><p className={`font-heading text-sm font-semibold tracking-tight ${inverted ? "text-white" : ""}`}>Creative Leaders</p><p className={`text-[11px] ${inverted ? "text-[var(--sidebar-inactive)]" : "text-muted-foreground"}`}>School operating system</p></div> : null}
    </div>
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

  const parsedRole = roleFromSlug(roleParam)
  const roleOk = parsedRole !== null
  const role: Role = parsedRole ?? "super_admin"
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
    const payments = can(role, "fees.totals") ? state.payments.filter((payment) => payment.ref.toLowerCase().includes(needle)).slice(0, 3).map((payment) => ({ id: payment.ref, label: payment.ref, hint: "Fee receipt", section: "fees" })) : []
    return [...students, ...payments]
  }, [query, role, state.payments, state.students])

  if (!roleOk) {
    return <Navigate to="/login" replace />
  }
  if (!sectionValid || roleParam !== portalPath(role).split("/")[1]) {
    return <Navigate to={portalPath(role, section)} replace />
  }

  async function changeRole(next: Role) {
    try {
      const creds = roles[next]
      const res = await api.login(creds.email, "password")
      saveAuth({ role: next, token: res.token, user: res.user })
    } catch {
      saveAuth({ role: next })
    }
    setQuery("")
    setMobileNavOpen(false)
    navigate(portalPath(next))
    window.dispatchEvent(new Event("eduvia:auth-changed"))
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
    if (role === "accountant") return <AccountantPortal section={section} />
    if (section === "overview") return <OperationsOverview onOpen={openSection} />
    if (section === "academic") return <AcademicSetup />
    if (section === "curriculum") return <CurriculumPanel />
    if (section === "lesson-review") return <LessonReviewPanel />
    if (section === "admissions") return <Admissions query={query} />
    if (section === "people") return <People query={query} />
    if (section === "absences") return <AbsencesPanel />
    if (section === "weekly-tests") return <WeeklyTestsPanel />
    if (section === "exams") return <Examinations />
    if (section === "results-gate") return <ResultsGatePanel />
    if (section === "fees") return <Fees query={query} />
    if (section === "finance") return <Finance />
    if (section === "messages") return <MessagesDesk />
    if (section === "settings") return <SettingsPanel />
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
          <SelectContent><SelectGroup>{ALL_ROLES.map((item) => <SelectItem key={item} value={item}>{roles[item].short} demo</SelectItem>)}</SelectGroup></SelectContent>
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
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordScreen /></GuestOnly>} />
      <Route path="/reset-password" element={<GuestOnly><ResetPasswordScreen /></GuestOnly>} />
      <Route path="/set-password" element={<GuestOnly><ResetPasswordScreen /></GuestOnly>} />
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
