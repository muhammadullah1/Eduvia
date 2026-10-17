import {
  Archive,
  BookOpen,
  CalendarOff,
  ChevronRight,
  DoorOpen,
  GraduationCap,
  Shield,
  Settings2,
} from "lucide-react"
import { useEffect, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { SettingsGeneralRules } from "./settings-general-rules"
import {
  ArchivesHub,
  BlockDatesPanel,
  LocationsPanel,
  RolesPanel,
} from "./settings-operations"

export type SettingsPanelId =
  | "general"
  | "academic"
  | "calendar"
  | "rooms"
  | "archives"
  | "roles"

const NAV: {
  id: SettingsPanelId
  label: string
  icon: typeof Settings2
}[] = [
  { id: "general", label: "General & rules", icon: Settings2 },
  { id: "academic", label: "Academic setup", icon: GraduationCap },
  { id: "calendar", label: "Calendar & black-out dates", icon: CalendarOff },
  { id: "rooms", label: "Rooms & locations", icon: DoorOpen },
  { id: "archives", label: "Archives", icon: Archive },
  { id: "roles", label: "Roles & permissions", icon: Shield },
]

function parsePanel(value: string | null): SettingsPanelId {
  if (value && NAV.some((item) => item.id === value)) {
    return value as SettingsPanelId
  }
  return "general"
}

export function SettingsPage() {
  const actor = useActor()
  const { syncPortalForRoute } = useSchool()
  const [searchParams, setSearchParams] = useSearchParams()
  const panel = parsePanel(searchParams.get("panel"))
  const { data: sessions = [] } = useSessionsList()
  const currentSession = sessions.find((s) => s.current)

  useEffect(() => {
    void syncPortalForRoute(actor.role, "settings")
  }, [actor.role, syncPortalForRoute])

  const academicLinks = useMemo(
    () => [
      {
        title: "Academic sessions",
        description: "School years, current session, and term dates.",
        href: portalPath(actor.role, "sessions"),
      },
      {
        title: "Classes & sections",
        description: "Active classes for the current session.",
        href: portalPath(actor.role, "classes"),
      },
      {
        title: "Subjects",
        description: "Subject catalog used across timetables and teaching.",
        href: portalPath(actor.role, "subjects"),
      },
    ],
    [actor.role]
  )

  function selectPanel(id: SettingsPanelId) {
    setSearchParams({ panel: id }, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
          Settings
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--cls-muted)]">
          School configuration, academic structure, and archives. Inspired by
          ASAMAN&apos;s settings layout — adapted for CLS-SMS.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            className="border-b border-[var(--cls-border)] bg-[var(--page-wash)]/40 p-3 lg:border-b-0 lg:border-r"
            aria-label="Settings sections"
          >
            <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = panel === item.id
                return (
                  <li key={item.id} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => selectPanel(item.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        active
                          ? "bg-white text-[var(--cls-ink)] shadow-sm"
                          : "text-[var(--cls-muted)] hover:bg-white/70 hover:text-[var(--cls-ink)]"
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="min-w-0 p-5 sm:p-6 lg:p-8">
            {panel === "general" ? (
              <section className="space-y-4">
                <header className="border-b border-[var(--cls-border)] pb-4">
                  <h2 className="text-base font-semibold text-[var(--cls-ink)]">
                    General &amp; assessment rules
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cls-muted)]">
                    Policies stored in school settings and applied across tests
                    and parent result visibility.
                  </p>
                </header>
                <SettingsGeneralRules />
              </section>
            ) : null}

            {panel === "academic" ? (
              <section className="space-y-4">
                <header className="border-b border-[var(--cls-border)] pb-4">
                  <h2 className="text-base font-semibold text-[var(--cls-ink)]">
                    Academic setup
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cls-muted)]">
                    Manage structure for{" "}
                    <span className="font-medium text-[var(--cls-ink)]">
                      {currentSession?.name ?? "no active session"}
                    </span>
                    . Uniqueness for classes is per session (grade + section).
                  </p>
                </header>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {academicLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="group flex h-full flex-col rounded-xl border border-[var(--cls-border)] bg-[var(--page-wash)]/30 p-4 transition-colors hover:border-[var(--cls-brand)]/40 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--cls-ink)]">
                              {link.title}
                            </p>
                            <p className="mt-1 text-xs text-[var(--cls-muted)]">
                              {link.description}
                            </p>
                          </div>
                          <ChevronRight
                            className="size-4 shrink-0 text-[var(--cls-muted)] transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="flex items-start gap-3 rounded-lg border border-[var(--cls-border)] bg-white p-4 text-sm">
                  <BookOpen
                    className="mt-0.5 size-4 shrink-0 text-[var(--cls-brand)]"
                    aria-hidden
                  />
                  <p className="text-[var(--cls-muted)]">
                    Timetables and teacher assignments live under{" "}
                    <Link
                      to={portalPath(actor.role, "timetable")}
                      className="font-medium text-[var(--cls-brand)] hover:underline"
                    >
                      Timetable
                    </Link>{" "}
                    and{" "}
                    <Link
                      to={portalPath(actor.role, "teachers-assignments")}
                      className="font-medium text-[var(--cls-brand)] hover:underline"
                    >
                      Staff
                    </Link>
                    .
                  </p>
                </div>
              </section>
            ) : null}

            {panel === "calendar" ? (
              <section className="space-y-4">
                <header className="border-b border-[var(--cls-border)] pb-4">
                  <h2 className="text-base font-semibold text-[var(--cls-ink)]">
                    Calendar &amp; black-out dates
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cls-muted)]">
                    Closures for this school. A range cannot exceed one month
                    and cannot overlap another active block. Archive removes it
                    from the calendar; restore is explicit.
                  </p>
                </header>
                <BlockDatesPanel />
              </section>
            ) : null}

            {panel === "rooms" ? (
              <section className="space-y-4">
                <header className="border-b border-[var(--cls-border)] pb-4">
                  <h2 className="text-base font-semibold text-[var(--cls-ink)]">
                    Rooms &amp; locations
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cls-muted)]">
                    School rooms used as a catalog. Class forms still store a
                    room name on the class; this list is the managed directory.
                  </p>
                </header>
                <LocationsPanel />
              </section>
            ) : null}

            {panel === "archives" ? (
              <section className="space-y-4">
                <header className="border-b border-[var(--cls-border)] pb-4">
                  <h2 className="text-base font-semibold text-[var(--cls-ink)]">
                    Archives
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cls-muted)]">
                    Soft-deleted classes, subjects, staff, rooms, and block
                    dates. Restore is a deliberate action and fails if an active
                    duplicate already exists.
                  </p>
                </header>
                <ArchivesHub />
              </section>
            ) : null}

            {panel === "roles" ? (
              <section className="space-y-4">
                <header className="border-b border-[var(--cls-border)] pb-4">
                  <h2 className="text-base font-semibold text-[var(--cls-ink)]">
                    Roles &amp; permissions
                  </h2>
                </header>
                <RolesPanel />
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {panel === "archives" ? (
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link to={portalPath(actor.role, "classes")}>Open classes page</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
