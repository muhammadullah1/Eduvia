import type { PortalSlug } from "@/lib/auth"

import { navigationLabelForSection } from "./navigation"

const GROUP_FOR_SECTION: Record<string, string> = {
  dashboard: "Dashboard",
  sessions: "Academic Management",
  classes: "Academic Management",
  subjects: "Academic Management",
  "teachers-assignments": "Academic Management",
  timetable: "Academic Management",
  substitutes: "Academic Management",
  "lesson-plan": "Academic Management",
  "daily-test-schedule": "Academic Management",
  exams: "Academic Management",
  academic: "Academic Management",
  curriculum: "Academic Management",
  admissions: "Student Management",
  students: "Student Management",
  "enrollment-promotion": "Student Management",
  lifecycle: "Student Management",
  "student-attendance": "Student Management",
  people: "Student Management",
  "weekly-tests": "Examinations",
  "results-gate": "Examinations",
  fees: "Finance",
  "collect-fee": "Finance",
  "offline-sync": "Finance",
  collections: "Finance",
  "fee-structure": "Finance",
  "fee-generation": "Finance",
  "fee-concessions": "Finance",
  families: "Student Management",
  finance: "Finance",
  expenses: "Finance",
  reports: "Reports",
  "audit-log": "Reports",
  settings: "Settings",
  roles: "Settings",
  "settings-academic": "Settings",
  "settings-calendar": "Settings",
  "settings-rooms": "Settings",
  "settings-archives": "Settings",
}

export function breadcrumbsForSection(
  section: string,
  portal: PortalSlug,
  panel?: string | null
) {
  if (section === "settings") {
    if (panel === "calendar") return ["Settings", "Calendar & Holidays"]
    if (panel === "rooms") return ["Settings", "Rooms & Locations"]
    if (panel === "archives") return ["Settings", "Archives"]
    return ["Settings", "Rules & Config"]
  }
  const group = GROUP_FOR_SECTION[section]
  const page = navigationLabelForSection(section, portal)
  if (group && group !== page) {
    return [group, page]
  }
  return [page]
}
