import { Bell, Menu, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useSchool } from "@/data/store"
import {
  AcademicSetup,
  Admissions,
  Examinations,
  Fees,
  Finance,
  ManagementDashboard,
  MessagesDesk,
  People,
  Reports,
} from "@/features/management/screens"
import {
  AbsencesPanel,
  AccountantPortal,
  CurriculumPanel,
  LessonReviewPanel,
  OperationsOverview,
  ResultsGatePanel,
  SettingsPanel,
  WeeklyTestsPanel,
} from "@/features/ops/screens"
import { ParentPortal } from "@/features/parent/screens"
import { TeacherPortal } from "@/features/teacher/screens"
import {
  clearAuth,
  defaultSection,
  loadAuth,
  portalPath,
  type Role,
  roleFromSlug,
} from "@/lib/auth"
import { timeAgo } from "@/lib/format"
import { can } from "@/lib/permissions"

import { HeaderUserMenu } from "./header-user-menu"
import { Logo } from "./logo"
import { navigation, roles, sectionIds, subtitles } from "./navigation"
import { PortalTopbar } from "./portal-topbar"
import { Sidebar } from "./sidebar"

const CLS_SHELL_ROLES = new Set<Role>(["super_admin", "operations_manager"])

export function PortalShell() {
  const { role: roleParam, section: sectionParam } = useParams()
  const navigate = useNavigate()
  const { state, syncPortalForRoute } = useSchool()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)

  const parsedRole = roleFromSlug(roleParam)
  const roleOk = parsedRole !== null
  const role: Role = parsedRole ?? "super_admin"
  const sectionValid = Boolean(
    sectionParam && sectionIds[role].has(sectionParam)
  )
  const section =
    sectionValid && sectionParam ? sectionParam : defaultSection[role]

  useEffect(() => {
    void syncPortalForRoute(role, section)
  }, [role, section, syncPortalForRoute])

  const current =
    navigation[role].find((item) => item.id === section) ?? navigation[role][0]
  const sessionLabel = useMemo(() => {
    const current = state.sessions.find((item) => item.current)
    return current?.label ?? "2026–2027"
  }, [state.sessions])
  const useClsShell = CLS_SHELL_ROLES.has(role)
  const session = loadAuth()
  const authRole = session?.role
  const signedInName = session?.user
    ? `${session.user.firstName} ${session.user.lastName}`.trim()
    : roles[role].short
  const initials = signedInName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2 || role === "parent") return []
    const students = state.students
      .filter((student) =>
        `${student.name} ${student.id}`.toLowerCase().includes(needle)
      )
      .slice(0, 4)
      .map((student) => ({
        id: student.id,
        label: student.name,
        hint: student.id,
        section: role === "teacher" ? "classes" : "admissions",
      }))
    const payments = can(role, "fees.totals")
      ? state.payments
          .filter((payment) => payment.ref.toLowerCase().includes(needle))
          .slice(0, 3)
          .map((payment) => ({
            id: payment.ref,
            label: payment.ref,
            hint: "Fee receipt",
            section: "fees",
          }))
      : []
    return [...students, ...payments]
  }, [query, role, state.payments, state.students])

  if (!roleOk || (authRole && authRole !== role)) {
    return <Navigate to={authRole ? portalPath(authRole) : "/login"} replace />
  }
  if (!sectionValid || roleParam !== portalPath(role).split("/")[1]) {
    return <Navigate to={portalPath(role, section)} replace />
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
    if (role === "teacher")
      return <TeacherPortal section={section} onOpen={openSection} />
    if (role === "parent") return <ParentPortal section={section} />
    if (role === "accountant") return <AccountantPortal section={section} />
    if (section === "overview")
      return <OperationsOverview onOpen={openSection} />
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
    if (section === "reports") return <Reports />
    return <ManagementDashboard onOpen={openSection} />
  })()

  return (
    <div className="min-h-svh bg-[var(--page-wash)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <Sidebar role={role} active={section} onNavigate={openSection} />
      </aside>
      <div className="lg:pl-64">
        <div className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Portal navigation</SheetTitle>
                <SheetDescription>
                  Choose a section of the school portal.
                </SheetDescription>
              </SheetHeader>
              <Sidebar
                role={role}
                active={section}
                onNavigate={openSection}
              />
            </SheetContent>
          </Sheet>
          <Logo />
        </div>
        {useClsShell ? (
          <div className="relative">
            <PortalTopbar
              role={role}
              section={section}
              userName={signedInName}
              initials={initials}
              sessionLabel={sessionLabel}
              query={query}
              onQueryChange={setQuery}
              onMenuClick={() => setMobileNavOpen(true)}
              onLogout={logout}
            />
            {results.length ? (
              <div className="absolute top-14 right-5 z-30 w-72 rounded-xl border border-[var(--cls-border)] bg-white p-1 shadow-lg">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-[var(--page-wash)]"
                    onClick={() => {
                      openSection(item.section)
                      setQuery(item.label)
                    }}
                  >
                    <span className="text-sm font-medium text-[var(--cls-ink)]">
                      {item.label}
                    </span>
                    <span className="text-xs text-[var(--cls-muted)]">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <header className="sticky top-0 z-20 flex flex-col gap-4 border-b bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>2026–27</span>
                  <span>·</span>
                  <span>{roles[role].short}</span>
                </div>
                <h1 className="text-[20px] font-semibold tracking-tight text-[var(--heading)] dark:text-foreground">
                  {current.label}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subtitles[section] ?? "Creative Leaders School"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative hidden min-w-64 md:block">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      role === "parent"
                        ? "Search is on each family page"
                        : "Search students or receipts"
                    }
                    className="pl-9"
                  />
                  {results.length ? (
                    <div className="absolute top-12 z-30 w-full rounded-xl border bg-popover p-1 shadow-lg">
                      {results.map((item) => (
                        <button
                          key={item.id}
                          className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-muted"
                          onClick={() => {
                            openSection(item.section)
                            setQuery(item.label)
                          }}
                        >
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Notifications"
                  onClick={() => setNotesOpen((open) => !open)}
                >
                  <Bell />
                </Button>
                <HeaderUserMenu
                  role={role}
                  userName={signedInName}
                  initials={initials}
                  onLogout={logout}
                  variant="default"
                />
              </div>
            </div>
            {notesOpen ? (
              <div className="rounded-xl border bg-card p-3">
                {state.audits.slice(0, 5).map((event) => (
                  <div key={event.id} className="border-b py-2 last:border-0">
                    <p className="text-sm">
                      <span className="font-medium">{event.actor}</span>{" "}
                      {event.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(event.at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </header>
        )}
        <main
          className={
            useClsShell
              ? "w-full p-4 sm:p-5 lg:p-6"
              : "mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8"
          }
        >
          {content}
        </main>
      </div>
    </div>
  )
}
