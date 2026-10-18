export type AcademicFocusTab = "sessions"

const ACADEMIC_SECTIONS: Record<string, AcademicFocusTab> = {
  sessions: "sessions",
  academic: "sessions",
}

export function academicFocusForSection(
  section: string
): AcademicFocusTab | null {
  return ACADEMIC_SECTIONS[section] ?? null
}

export function academicPortalSectionForTab(_tab: AcademicFocusTab): string {
  return "sessions"
}
