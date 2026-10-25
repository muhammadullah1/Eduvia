import { Bell, Search } from "lucide-react"
import { type CSSProperties,useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useSchool } from "@/data/store"
import { CollectFeePage } from "@/features/fees/collect"
import { OfflineSyncPage } from "@/features/fees/offline-sync"
import { AttendanceReviewPage } from "@/features/management/attendance"
import { DailyTestSchedulePage } from "@/features/management/daily-tests/daily-test-schedule-page"
import { EnrollmentPromotionPage } from "@/features/management/enrollment-promotion"
import { LifecyclePage } from "@/features/management/lifecycle"
import {
  AcademicSetup,
  Admissions,
  AuditLogPage,
  Classes,
  Examinations,
  FeeManagement,
  Finance,
  ManagementDashboard,
  MessagesDesk,
  Reports,
  Sessions,
  Subjects,
  TeachersAssignments,
  Timetable,
} from "@/features/management/screens"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { Students } from "@/features/management/students/students"
import { SubstitutesPage } from "@/features/management/substitutes/substitutes-page"
import {
  AccountantPortal,
  CurriculumPanel,
  LessonReviewPanel,
  OperationsOverview,
  SettingsPanel,
  WeeklyTestsPanel,
} from "@/features/ops/screens"
import { ParentPortal } from "@/features/parent/screens"
import { TeacherNotificationsBell } from "@/features/teacher/attendance-notices"
import { TeacherPortal } from "@/features/teacher/screens"
import { api } from "@/lib/api"
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
import { announceLogout } from "@/lib/token-refresh"

import { academicFocusForSection } from "./academic-section"
import { HeaderUserMenu } from "./header-user-menu"
import { navigation, roles, sectionIds, subtitles } from "./navigation"
import { PortalTopbar } from "./portal-topbar"
import { Sidebar } from "./sidebar"

const LEGACY_SECTION_REDIRECT: Record<string, string> = {
  academic: "sessions",
  curriculum: "lesson-plan",
  people: "students",
  absences: "substitutes",
  "weekly-tests": "daily-test-schedule",
  "results-gate": "exams",
}

/** Sub-path appended when a legacy section moved under another section. */
const LEGACY_SECTION_REST: Record<string, string> = {
  "results-gate": "result-visibility",
}

const CLS_SHELL_ROLES = new Set<Role>(["super_admin", "operations_manager"])
/** Roles that get the green sidebar + top bar. The accountant gets it with only their own links. */
const SIDEBAR_SHELL_ROLES = new Set<Role>(["super_admin", "operations_manager", "accountant"])

export function PortalShell() {
  const { role: roleParam, section: sectionParam } = useParams()
  const navigate = useNavigate()
  const { state, syncPortalForRoute } = useSchool()
  const [query, setQuery] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)

  const parsedRole = roleFromSlug(roleParam)
  const roleOk = parsedRole !== null
  const role: Role = parsedRole ?? "super_admin"
  const sectionValid = Boolean(
    sectionParam && sectionIds[role].has(sectionParam)
  )
  const rawSection =
    sectionValid && sectionParam ? sectionParam : defaultSection[role]
  const legacyTarget = CLS_SHELL_ROLES.has(role)
    ? LEGACY_SECTION_REDIRECT[rawSection]
    : undefined
  const section = legacyTarget ?? rawSection

  useEffect(() => {
    void syncPortalForRoute(role, section)
  }, [role, section, syncPortalForRoute])

  const current =
    navigation[role].find((item) => item.id === section) ?? navigation[role][0]
  const { data: sessionsFromApi = [] } = useSessionsList()
  const sessionLabel = useMemo(() => {
    const sessions =
      sessionsFromApi.length > 0 ? sessionsFromApi : state.sessions
    const current = sessions.find((item) => item.current)
    return current?.name ?? "2026–2027"
  }, [sessionsFromApi, state.sessions])
  const useClsShell = SIDEBAR_SHELL_ROLES.has(role)
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
  if (
    !sectionValid ||
    roleParam !== portalPath(role).split("/")[1] ||
    (sectionParam && legacyTarget)
  ) {
    return (
      <Navigate
        to={portalPath(role, section, legacyTarget ? LEGACY_SECTION_REST[rawSection] : undefined)}
        replace
      />
    )
  }

  function openSection(id: string) {
    setNotesOpen(false)
    navigate(portalPath(role, id))
  }

  function logout() {
    void api.logout()
    clearAuth()
    announceLogout()
    navigate("/login", { replace: true })
  }

  const content = (() => {
    if (role === "teacher")
      return <TeacherPortal section={section} onOpen={openSection} />
    if (role === "parent") return <ParentPortal section={section} />
    if (role === "accountant") return <AccountantPortal section={section} />
    if (section === "overview")
      return <OperationsOverview onOpen={openSection} />
    if (section === "sessions") return <Sessions />
    if (section === "subjects") return <Subjects query={query} />
    if (section === "timetable") return <Timetable />
    if (section === "teachers-assignments") {
      return <TeachersAssignments query={query} />
    }
    {
      const academicFocus = academicFocusForSection(section)
      if (academicFocus && academicFocus !== "sessions") {
        return <AcademicSetup focusTab={academicFocus} />
      }
    }
    if (section === "classes") return <Classes query={query} />
    if (section === "lesson-plan") return <CurriculumPanel />
    if (section === "lesson-review") return <LessonReviewPanel />
    if (section === "admissions") return <Admissions query={query} />
    if (section === "students" || section === "people") {
      return <Students query={query} />
    }
    if (section === "enrollment-promotion") return <EnrollmentPromotionPage />
    if (section === "lifecycle") return <LifecyclePage />
    if (section === "student-attendance") return <AttendanceReviewPage />
    if (section === "substitutes" || section === "absences") {
      return <SubstitutesPage />
    }
    if (section === "daily-test-schedule") return <DailyTestSchedulePage />
    if (section === "weekly-tests") return <WeeklyTestsPanel />
    if (section === "exams") return <Examinations />
    if (section === "fees") return <FeeManagement query={query} />
    if (section === "collect-fee") return <CollectFeePage />
    if (section === "offline-sync") return <OfflineSyncPage />
    if (section === "finance") return <Finance />
    if (section === "messages") return <MessagesDesk />
    if (section === "settings") return <SettingsPanel />
    if (section === "reports") return <Reports />
    if (section === "audit-log" && can(role, "audit.view")) return <AuditLogPage />
    return <ManagementDashboard onOpen={openSection} />
  })()

  const shell = (
    <>
        {useClsShell ? (
          <PortalTopbar
            role={role}
            section={section}
            userName={signedInName}
            initials={initials}
            sessionLabel={sessionLabel}
            onLogout={logout}
            onOpenSection={openSection}
          />
        ) : (
          <header className="sticky top-0 z-20 flex flex-col gap-4 border-b bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>2026–27</span>
                  <span>·</span>
                  <span>{roles[role].short}</span>
                </div>
                <h1 className="text-[20px] font-semibold tracking-tight text-[var(--heading)] ">
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
                {role === "teacher" ? (
                  <TeacherNotificationsBell onOpenAttendance={() => openSection("attendance")} />
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Notifications"
                    onClick={() => setNotesOpen((open) => !open)}
                  >
                    <Bell />
                  </Button>
                )}
                <HeaderUserMenu
                  role={role}
                  userName={signedInName}
                  initials={initials}
                  onLogout={logout}
                  variant="default"
                />
              </div>
            </div>
            {notesOpen && role !== "teacher" ? (
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
    </>
  )

  if (useClsShell) {
    return (
      <SidebarProvider
        className="min-h-svh bg-[var(--page-wash)]"
        style={{ "--sidebar-width": "240px" } as CSSProperties}
      >
        <Sidebar role={role} active={section} onNavigate={openSection} />
        {/* min-w-0: wide children (e.g. the admissions pipeline) scroll inside themselves instead of widening the page. */}
        <SidebarInset className="min-h-svh min-w-0 bg-[var(--page-wash)]">
          {shell}
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return <div className="min-h-svh bg-[var(--page-wash)]">{shell}</div>
}
