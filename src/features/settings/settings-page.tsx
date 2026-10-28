import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { useSchool } from "@/data/store"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

import { SettingsGeneralRules } from "./settings-general-rules"
import {
  ArchivesHub,
  BlockDatesPanel,
  LocationsPanel,
  RolesPanel,
} from "./settings-operations"

export type SettingsPanelId =
  | "general"
  | "calendar"
  | "rooms"
  | "archives"
  | "roles"

const PANEL_METADATA: Record<
  SettingsPanelId,
  { title: string; subtitle: string }
> = {
  general: {
    title: "Rules & Config",
    subtitle:
      "School profile, grading reference, attendance, daily tests, fees, and result rules.",
  },
  calendar: {
    title: "Calendar & Holidays",
    subtitle: "School closures, holidays, and calendar black-out dates.",
  },
  rooms: {
    title: "Rooms",
    subtitle: "School room catalog and facility capacity management.",
  },
  archives: {
    title: "Archives",
    subtitle:
      "Review and restore soft-deleted classes, subjects, staff, rooms, and block dates.",
  },
  roles: {
    title: "Roles & Permissions",
    subtitle: "School permission matrix and system capabilities by role.",
  },
}

function resolvePanel(
  section?: string,
  searchPanel?: string | null
): SettingsPanelId {
  // Safe backward compatibility for legacy section values
  if (section === "settings-calendar") return "calendar"
  if (section === "settings-rooms") return "rooms"
  if (section === "settings-archives") return "archives"
  if (section === "settings-roles") return "roles"
  if (
    searchPanel &&
    ["general", "calendar", "rooms", "archives", "roles"].includes(searchPanel)
  ) {
    return searchPanel as SettingsPanelId
  }
  return "general"
}

export function SettingsPage({ section }: { section?: string }) {
  const actor = useActor()
  const navigate = useNavigate()
  const { syncPortalForRoute } = useSchool()
  const [searchParams] = useSearchParams()
  const searchPanel = searchParams.get("panel")

  // Safe redirect if a user hits the removed / redundant academic panel
  useEffect(() => {
    if (searchPanel === "academic" || section === "settings-academic") {
      navigate(portalPath(actor.role, "settings"), { replace: true })
    }
  }, [searchPanel, section, actor.role, navigate])

  const panel = resolvePanel(section, searchPanel)
  const meta = PANEL_METADATA[panel]

  useEffect(() => {
    void syncPortalForRoute(actor.role, "settings")
  }, [actor.role, syncPortalForRoute])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--heading)]">
          {meta.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--cls-muted)]">
          {meta.subtitle}
        </p>
      </div>

      <div
        className={
          panel === "general"
            ? "overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
            : "rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] sm:p-6 lg:p-7"
        }
      >
        {panel === "general" ? <SettingsGeneralRules /> : null}
        {panel === "calendar" ? <BlockDatesPanel /> : null}
        {panel === "rooms" ? <LocationsPanel /> : null}
        {panel === "archives" ? <ArchivesHub /> : null}
        {panel === "roles" ? <RolesPanel /> : null}
      </div>
    </div>
  )
}
