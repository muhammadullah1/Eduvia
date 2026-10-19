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
  /** Session list is React Query. Header session label uses the same query. */
  sessions: [],
  /** List/detail load via React Query (`useClassesList`, etc.). */
  classes: [],
  /** Subjects, class tags, and timetable columns load via React Query. */
  subjects: [],
  "teachers-assignments": [],
  /** Class grid, school conflicts, and teachers load via React Query. */
  timetable: [],
  /** Dated absences and teachers load via React Query. Classes and slots stay in the store. */
  substitutes: ["classes", "slots"],
  absences: ["classes", "slots"],
  "lesson-plan": [],
  curriculum: ["plannedChapters"],
  "lesson-review": ["dailyLessons"],
  "daily-test-schedule": ["classes", "subjects", "settings", "slots", "testSchedules"],
  "weekly-tests": ["testSchedules", "weeklyTests"],
  students: ["staff", "students"],
  "enrollment-promotion": ["applications", "students"],
  lifecycle: ["resultOverrides", "students"],
  "student-attendance": ["attendance", "students"],
  "collect-fee": ["students", "feeMonths", "payments"],
  "offline-sync": ["students", "feeMonths", "payments"],
  /** Examination UI is not integrated. Do not preload portal datasets. */
  exams: [],
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

/** These routes own their data through React Query or an explicit slice list. */
const NO_DEFAULT_CORE = new Set([
  "classes",
  "admissions",
  "teachers-assignments",
  "lesson-plan",
  "sessions",
  "subjects",
  "timetable",
  "exams",
  "daily-test-schedule",
  "substitutes",
  "absences",
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
    return { mode: "partial", slices: [] }
  }
  if (NO_DEFAULT_CORE.has(section)) {
    return { mode: "partial", slices: [...new Set(sectionSlices)] }
  }
  const core = MINIMAL_CORE_SECTIONS.has(section)
    ? (["classes"] as const)
    : PORTAL_CORE_SLICES
  const slices = [...new Set([...core, ...sectionSlices])]
  return { mode: "partial", slices }
}
