export type AcademicFocusTab = "sessions" | "teachers"

const ACADEMIC_SECTIONS: Record<string, AcademicFocusTab> = {
  sessions: "sessions",
  academic: "sessions",
  "teachers-assignments": "teachers",
}

export function academicFocusForSection(
  section: string
): AcademicFocusTab | null {
  return ACADEMIC_SECTIONS[section] ?? null
}

export function academicPortalSectionForTab(
  tab: AcademicFocusTab
): string {
  if (tab === "sessions") return "sessions"
  return "teachers-assignments"
}
