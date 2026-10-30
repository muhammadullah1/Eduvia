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
} from "./settings-operations"

export type SettingsPanelId =
  | "general"
  | "calendar"
  | "rooms"
  | "archives"

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
}

const SETTINGS_PANELS: readonly SettingsPanelId[] = [
  "general",
  "calendar",
  "rooms",
  "archives",
]

function isSettingsPanel(value: string): value is SettingsPanelId {
  return SETTINGS_PANELS.some((panel) => panel === value)
}

function resolvePanel(
  section?: string,
  searchPanel?: string | null
): SettingsPanelId {
  if (section === "settings-calendar") return "calendar"
  if (section === "settings-rooms") return "rooms"
  if (section === "settings-archives") return "archives"
  if (
    searchPanel &&
    isSettingsPanel(searchPanel)
  ) {
    return searchPanel
  }
  return "general"
}

export function SettingsPage({ section }: { section?: string }) {
  const actor = useActor()
  const navigate = useNavigate()
  const { syncPortalForRoute } = useSchool()
  const [searchParams] = useSearchParams()
  const searchPanel = searchParams.get("panel")

  useEffect(() => {
    if (searchPanel === "roles" || section === "settings-roles") {
      navigate(portalPath(actor.role, "roles"), { replace: true })
      return
    }
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
      </div>
    </div>
  )
}
