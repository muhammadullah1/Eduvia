export type AcademicFocusTab =
  | "sessions"
  | "subjects"
  | "teachers"
  | "timetable"

const ACADEMIC_SECTIONS: Record<string, AcademicFocusTab> = {
  sessions: "sessions",
  academic: "sessions",
  subjects: "subjects",
  "teachers-assignments": "teachers",
  timetable: "timetable",
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
  if (tab === "subjects") return "subjects"
  if (tab === "teachers") return "teachers-assignments"
  return "timetable"
}
