import type { Role } from "@/lib/auth"

import { navigationLabelForSection } from "./navigation"

const GROUP_FOR_SECTION: Record<string, string> = {
  dashboard: "Dashboard",
  overview: "Operations",
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
  "lesson-review": "Academic Management",
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
  collect: "Finance",
  collections: "Finance",
  "fee-structure": "Finance",
  "fee-generation": "Finance",
  finance: "Finance",
  expenses: "Finance",
  reports: "Reports",
  "audit-log": "Reports",
  settings: "Settings",
  "settings-academic": "Settings",
  "settings-calendar": "Settings",
  "settings-rooms": "Settings",
  "settings-archives": "Settings",
  "settings-roles": "Settings",
  messages: "Communication",
}

export function breadcrumbsForSection(
  section: string,
  role: Role,
  panel?: string | null
) {
  if (section === "settings") {
    if (panel === "calendar") return ["Settings", "Calendar & Holidays"]
    if (panel === "rooms") return ["Settings", "Rooms & Locations"]
    if (panel === "archives") return ["Settings", "Archives"]
    if (panel === "roles") return ["Settings", "Roles & Permissions"]
    return ["Settings", "General & Rules"]
  }
  const group = GROUP_FOR_SECTION[section]
  const page = navigationLabelForSection(section, role)
  if (section === "dashboard" && role === "operations_manager") {
    return ["Operations", "Overview"]
  }
  if (group && group !== page) {
    return [group, page]
  }
  return [page]
}
