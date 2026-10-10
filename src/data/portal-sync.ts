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
  curriculum: ["plannedChapters"],
  "lesson-review": ["dailyLessons"],
  absences: ["teacherAbsences", "substitutions"],
  "weekly-tests": ["testSchedules", "weeklyTests"],
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

export function resolvePortalSyncPlan(role: Role, section: string): PortalSyncPlan {
  if (role === "teacher" || role === "parent" || role === "accountant") {
    return { mode: "full" }
  }
  const sectionSlices = ADMIN_SECTION_SLICES[section]
  if (!sectionSlices) {
    return { mode: "full" }
  }
  const includeCore = section !== "admissions"
  const slices = includeCore
    ? [...new Set([...PORTAL_CORE_SLICES, ...sectionSlices])]
    : [...new Set(sectionSlices)]
  return { mode: "partial", slices }
}
