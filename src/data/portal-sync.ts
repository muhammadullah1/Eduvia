import { holds, type PermissionKey } from "@/lib/access"
import type { Role } from "@/lib/auth"
import { useAuthStore } from "@/stores/auth-store"

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
  /** Income, expenses and the report load via React Query (`features/finance`). */
  finance: [],
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
  "daily-test-schedule": ["classes", "subjects", "settings", "slots", "testSchedules"],
  "weekly-tests": ["testSchedules", "weeklyTests"],
  students: ["staff", "students"],
  "enrollment-promotion": ["applications", "students"],
  lifecycle: ["resultOverrides", "students"],
  "student-attendance": ["attendance", "students"],
  "collect-fee": ["students", "feeMonths", "payments"],
  "offline-sync": ["students", "feeMonths", "payments"],
  /** Exam list/marks load via React Query (`examsService`). */
  exams: [],
  "results-gate": ["resultOverrides", "students", "feeMonths"],
  settings: [],
  /** Fee reports load from /fees/reports; only the SA audit trail comes from the store. */
  reports: ["audits"],
  /** Operations Manager's read-only audit log. */
  "audit-log": ["audits"],
}

/**
 * The permission each slice's read endpoint requires (Eduvia-Api `constants/permissions.js`).
 * A session without it would get a 403, so the portal never asks.
 */
export const SLICE_READ_PERMISSIONS: Record<SchoolDataSlice | "users", PermissionKey> = {
  classes: "academic.read",
  sessions: "academic.read",
  subjects: "academic.read",
  settings: "settings.read",
  staff: "teachers.read",
  users: "users.read",
  students: "students.read",
  applications: "admissions.manage",
  feeMonths: "fees.months.read",
  payments: "fees.payments.read",
  expenses: "expenses.read",
  sheets: "exams.read",
  resultOverrides: "results.override",
  attendance: "attendance.read",
  plannedChapters: "chapters.read",
  dailyLessons: "lessons.read",
  slots: "timetable.read",
  teacherAbsences: "absences.read",
  substitutions: "absences.read",
  testSchedules: "tests.read",
  weeklyTests: "tests.read",
  updates: "updates.read",
  audits: "audit.read",
}

/** Permissions of the signed-in session; `undefined` before sign-in. */
export type SessionPermissions = readonly PermissionKey[] | undefined

/** The live session's permissions for non-React callers. */
export function sessionPermissions(): SessionPermissions {
  const { role, permissions } = useAuthStore.getState()
  if (!role) return undefined
  return permissions
}

export function canReadSlice(permissions: SessionPermissions, slice: SchoolDataSlice | "users") {
  return Boolean(permissions) && holds(permissions ?? [], SLICE_READ_PERMISSIONS[slice])
}

/** Slices this session may not read, so syncing skips them (no doomed 403s). */
export function unavailableSlicesFor(permissions: SessionPermissions): ReadonlySet<SchoolDataSlice> {
  if (!permissions) return new Set()
  return new Set(
    (Object.keys(SLICE_READ_PERMISSIONS) as (SchoolDataSlice | "users")[]).filter(
      (slice): slice is SchoolDataSlice => slice !== "users" && !canReadSlice(permissions, slice)
    )
  )
}

/** Drop the slices this session cannot read. */
export function readableSlices(permissions: SessionPermissions, slices: Iterable<SchoolDataSlice>): SchoolDataSlice[] {
  const blocked = unavailableSlicesFor(permissions)
  return [...new Set(slices)].filter((slice) => !blocked.has(slice))
}

/** Staff user accounts (/users) need users.read; teachers still load /teachers. */
export function canListUserAccounts(permissions: SessionPermissions) {
  return canReadSlice(permissions, "users")
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

export function resolvePortalSyncPlan(
  role: Role,
  permissions: SessionPermissions,
  section: string
): PortalSyncPlan {
  if (role === "teacher" || role === "parent" || role === "accountant") {
    return { mode: "full" }
  }
  if (section === "settings") {
    return { mode: "partial", slices: readableSlices(permissions, ["settings"]) }
  }
  const sectionSlices = ADMIN_SECTION_SLICES[section]
  if (!sectionSlices) {
    return { mode: "partial", slices: [] }
  }
  if (NO_DEFAULT_CORE.has(section)) {
    return { mode: "partial", slices: readableSlices(permissions, sectionSlices) }
  }
  const core = MINIMAL_CORE_SECTIONS.has(section)
    ? (["classes"] as const)
    : PORTAL_CORE_SLICES
  return { mode: "partial", slices: readableSlices(permissions, [...core, ...sectionSlices]) }
}
