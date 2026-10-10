import type { Role } from "@/lib/auth"

const CRUMBS: Record<string, string[]> = {
  dashboard: ["Dashboard"],
  overview: ["Operations"],
  academic: ["Academic Management", "Academic setup"],
  curriculum: ["Academic Management", "Planned chapters"],
  "lesson-review": ["Academic Management", "Lesson review"],
  admissions: ["Student Management", "Admissions"],
  people: ["Student Management", "People"],
  absences: ["Attendance"],
  "weekly-tests": ["Examinations", "Weekly tests"],
  exams: ["Examinations"],
  "results-gate": ["Examinations", "Result visibility"],
  fees: ["Fee Management", "Fees & sync"],
  finance: ["Finance"],
  messages: ["Communication"],
  settings: ["Settings"],
  reports: ["Reports & audit"],
  collect: ["Fee Management", "Record payment"],
  collections: ["Fee Management", "My daily receipts"],
}

export function breadcrumbsForSection(section: string, role: Role) {
  if (section === "dashboard" && role === "operations_manager") {
    return ["Operations", "Overview"]
  }
  return CRUMBS[section] ?? ["Portal"]
}
