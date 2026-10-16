import type { Role } from "@/lib/auth"

/** Loaded on every authenticated admin portal view (session label, class pickers, etc.). */
export const PORTAL_CORE_SLICES = [
  "classes",
  "sessions",
  "subjects",
  "settings",
] as const

export type PortalCoreSlice = (typeof PORTAL_CORE_SLICES)[number]

export type SchoolDataSlice =
  | PortalCoreSlice
  | "staff"
  | "students"
  | "applications"
  | "feeMonths"
  | "payments"
  | "expenses"
  | "sheets"
  | "resultOverrides"
  | "attendance"
  | "plannedChapters"
  | "dailyLessons"
  | "slots"
  | "teacherAbsences"
  | "substitutions"
  | "testSchedules"
  | "weeklyTests"
  | "updates"
  | "audits"

const ADMIN_SECTION_SLICES: Record<string, SchoolDataSlice[]> = {
  /** List loads via paginated admissions API in the list page. */
  admissions: [],
  dashboard: ["students", "applications", "feeMonths", "payments"],
  overview: [
    "students",
    "applications",
    "feeMonths",
    "payments",
    "teacherAbsences",
    "weeklyTests",
  ],
  people: ["staff", "students"],
  fees: ["students", "feeMonths", "payments"],
  finance: ["expenses", "payments"],
  academic: ["staff", "slots"],
  sessions: ["staff", "slots"],
  /** List/detail load via React Query (`useClassesList`, etc.). */
  classes: [],
  subjects: ["staff", "slots"],
  "teachers-assignments": ["staff"],
  timetable: ["staff", "slots"],
  /** Absences/substitutions load via React Query on the substitutes page. */
  substitutes: ["slots"],
  absences: ["slots"],
  "lesson-plan": ["plannedChapters"],
  curriculum: ["plannedChapters"],
  "lesson-review": ["dailyLessons"],
  "daily-test-schedule": ["testSchedules", "weeklyTests"],
  "weekly-tests": ["testSchedules", "weeklyTests"],
  students: ["staff", "students"],
  "enrollment-promotion": ["applications", "students"],
  lifecycle: ["resultOverrides", "students"],
  "student-attendance": ["attendance", "students"],
  "collect-fee": ["students", "feeMonths", "payments"],
  "offline-sync": ["students", "feeMonths", "payments"],
  exams: ["sheets", "resultOverrides", "students"],
  "results-gate": ["resultOverrides", "students", "feeMonths"],
  messages: ["updates"],
  settings: [],
  reports: ["students", "feeMonths", "payments", "expenses"],
}

export type PortalSyncPlan =
  | { mode: "full" }
  | { mode: "partial"; slices: SchoolDataSlice[] }

/** Loaded when the new-application wizard opens (class/session pickers, etc.). */
export const ADMISSION_WIZARD_SLICES: SchoolDataSlice[] = [
  "classes",
  "sessions",
]

const MINIMAL_CORE_SECTIONS = new Set(["substitutes", "absences"])

/** Primary data comes from React Query — do not pull portal core or legacy store slices. */
const REACT_QUERY_SECTIONS = new Set([
  "classes",
  "admissions",
  "teachers-assignments",
])

export function resolvePortalSyncPlan(role: Role, section: string): PortalSyncPlan {
  if (role === "teacher" || role === "parent" || role === "accountant") {
    return { mode: "full" }
  }
  if (section === "settings") {
    return { mode: "partial", slices: ["settings"] }
  }
  const sectionSlices = ADMIN_SECTION_SLICES[section]
  if (!sectionSlices) {
    return { mode: "full" }
  }
  if (REACT_QUERY_SECTIONS.has(section)) {
    return { mode: "partial", slices: [...new Set(sectionSlices)] }
  }
  if (section === "admissions") {
    return { mode: "partial", slices: [...new Set(sectionSlices)] }
  }
  const core = MINIMAL_CORE_SECTIONS.has(section)
    ? (["classes"] as const)
    : PORTAL_CORE_SLICES
  const slices = [...new Set([...core, ...sectionSlices])]
  return { mode: "partial", slices }
}
