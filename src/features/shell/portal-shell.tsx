import { Bell, Search } from "lucide-react"
import { type CSSProperties, useEffect, useMemo, useState } from "react"
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useSchool } from "@/data/store"
import { CollectFeePage } from "@/features/fees/collect"
import { MyCollections } from "@/features/fees/my-collections"
import { OfflineSyncPage } from "@/features/fees/offline-sync"
import { AccountantExpensesPage } from "@/features/finance/finance-page"
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
  FeeConcessionsPage,
  FeeManagement,
  FeeStructurePage,
  Finance,
  ManagementDashboard,
  MonthlyGenerationPage,
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
  CurriculumPanel,
  OperationsOverview,
  SettingsPanel,
  WeeklyTestsPanel,
} from "@/features/ops/screens"
import { ParentPortal } from "@/features/parent/screens"
import { RolesSection } from "@/features/roles/roles-section"
import { TeacherNotificationsBell } from "@/features/teacher/attendance-notices"
import { TeacherPortal } from "@/features/teacher/screens"
import { useCan } from "@/lib/access"
import { api } from "@/lib/api"
import {
  clearAuth,
  defaultSection,
  LEGACY_PORTAL_SLUGS,
  loadAuth,
  portalForRole,
  portalPath,
  type PortalSlug,
  type Role,
} from "@/lib/auth"
import { timeAgo } from "@/lib/format"
import { announceLogout } from "@/lib/token-refresh"
import { useSessionSync } from "@/lib/use-session"
import { useAuthStore } from "@/stores/auth-store"

import { academicFocusForSection } from "./academic-section"
import { HeaderUserMenu } from "./header-user-menu"
import {
  allowedSections,
  findSection,
  isSectionAllowed,
  LEGACY_SECTIONS,
  navigationLabelForSection,
  type NavItem,
  roles,
  subtitles,
} from "./navigation"
import { PortalTopbar } from "./portal-topbar"
import { SectionForbidden } from "./section-forbidden"
import { Sidebar } from "./sidebar"

/** The role's usual landing section when it can open it, otherwise its first permitted section. */
function homeSection(role: Role, allowed: readonly NavItem[]) {
  const preferred = defaultSection[role]
  if (allowed.some((item) => item.id === preferred)) return preferred
  const [first] = allowed
  if (first) return first.id
  return preferred
}

/** Where an out-of-date URL (old portal slug, renamed section, another role's portal) should go. */
function redirectFor(
  slug: string | undefined,
  section: string,
  portal: PortalSlug,
  role: Role
) {
  const legacy = LEGACY_SECTIONS[section]
  const onStaffPortal = portal === "admin"
  if (slug === portal && !(onStaffPortal && legacy)) return null
  const fromLegacyPortal = slug !== undefined && LEGACY_PORTAL_SLUGS.has(slug)
  if (slug !== portal && !(onStaffPortal && fromLegacyPortal)) return portalPath(role)
  if (!legacy) return portalPath(role, section)
  return `${portalPath(role, legacy.section, legacy.rest)}${legacy.query ?? ""}`
}

export function PortalShell() {
  const { role: slugParam, section: sectionParam } = useParams()
  const navigate = useNavigate()
  const { state, syncPortalForRoute } = useSchool()
  const [query, setQuery] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const sessionReady = useSessionSync()
  const role = useAuthStore((store) => store.role)
  const can = useCan()
  const portal = portalForRole(role)
  const allowed = useMemo(() => allowedSections(portal, can), [portal, can])
  const home = homeSection(role, allowed)
  const requested = sectionParam ?? home
  const item = findSection(portal, requested)
  const section = item?.id ?? home
  const permitted = item !== undefined && isSectionAllowed(item, can)

  useEffect(() => {
    void syncPortalForRoute(role, section)
  }, [role, section, syncPortalForRoute])

  const [searchParams] = useSearchParams()
  const activeSection = useMemo(() => {
    if (section === "settings") {
      const panel = searchParams.get("panel")
      if (panel && panel !== "general") {
        return `settings?panel=${panel}`
      }
    }
    return section
  }, [section, searchParams])

  const currentLabel = navigationLabelForSection(section, portal)
  const { data: sessionsFromApi = [] } = useSessionsList()
  const sessionLabel = useMemo(() => {
    const sessions =
      sessionsFromApi.length > 0 ? sessionsFromApi : state.sessions
    const current = sessions.find((item) => item.current)
    return current?.name ?? "2026–2027"
  }, [sessionsFromApi, state.sessions])
  const useClsShell = portal === "admin"
  const session = loadAuth()
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
    const payments = can("fees.totals")
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
  }, [can, query, role, state.payments, state.students])

  if (!sessionReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--page-wash)]">
        <Spinner className="size-6 text-[var(--cls-brand)]" aria-label="Loading your portal" />
      </div>
    )
  }
  const redirect = redirectFor(slugParam, requested, portal, role)
  if (redirect) return <Navigate to={redirect} replace />
  if (!item) return <Navigate to={portalPath(role, home)} replace />

  function openSection(id: string, panel?: string) {
    setNotesOpen(false)
    if (panel) {
      navigate(`${portalPath(role, id)}?panel=${panel}`)
    } else {
      navigate(portalPath(role, id))
    }
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
    if (!permitted) return <SectionForbidden onHome={() => openSection(home)} />
    if (section === "dashboard") {
      if (can("fees.totals")) return <ManagementDashboard onOpen={openSection} />
      return <OperationsOverview onOpen={openSection} />
    }
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
    if (section === "fee-concessions") return <FeeConcessionsPage />
    if (section === "collections") return <MyCollections />
    if (section === "fee-structure") return <FeeStructurePage />
    if (section === "fee-generation") return <MonthlyGenerationPage />
    if (section === "expenses") return <AccountantExpensesPage />
    if (section === "roles") return <RolesSection />
    if (section === "collect-fee") return <CollectFeePage />
    if (section === "offline-sync") return <OfflineSyncPage />
    if (section === "finance") return <Finance />
    if (section === "settings") {
      return <SettingsPanel section={section} />
    }
    if (section === "reports") return <Reports />
    return <AuditLogPage />
  })()

  const shell = (
    <>
        {useClsShell ? (
          <PortalTopbar
            role={role}
            section={section}
            panel={searchParams.get("panel")}
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
                  {currentLabel}
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
        <Sidebar
          portal={portal}
          items={allowed}
          home={home}
          active={activeSection}
          onNavigate={openSection}
        />
        {/* min-w-0: wide children (e.g. the admissions pipeline) scroll inside themselves instead of widening the page. */}
        <SidebarInset className="min-h-svh min-w-0 bg-[var(--page-wash)]">
          {shell}
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return <div className="min-h-svh bg-[var(--page-wash)]">{shell}</div>
}
