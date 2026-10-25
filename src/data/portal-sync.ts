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
  "lesson-review": ["dailyLessons", "plannedChapters", "staff"],
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
  /** Fee reports load from /fees/reports; only the SA audit trail comes from the store. */
  reports: ["audits"],
  /** Operations Manager's read-only audit log. */
  "audit-log": ["audits"],
}

const SA = "super_admin"
const OPS = "operations_manager"
const ACC = "accountant"
const TCH = "teacher"
const PAR = "parent"
const EVERYONE: Role[] = [SA, OPS, ACC, TCH, PAR]

/**
 * Who may read each slice's endpoint. Mirrors the API permission map
 * (Eduvia-Api `constants/permissions.js`); a role missing here gets a 403 from the API,
 * so the portal never asks. Fee data is Super Admin + Accountant (+ a parent's own child);
 * the Operations Manager never receives fee months, payments or expenses.
 */
export const SLICE_READ_ROLES: Record<SchoolDataSlice | "users", readonly Role[]> = {
  classes: EVERYONE, // academic.read
  sessions: EVERYONE,
  subjects: EVERYONE,
  settings: [SA, OPS], // settings.read
  staff: [SA, OPS, TCH], // teachers.read (/teachers)
  users: [SA, OPS], // users.read (/users)
  students: EVERYONE, // students.read (scoped server-side)
  applications: [SA, OPS], // admissions.manage
  feeMonths: [SA, ACC, PAR], // fees.months.read
  payments: [SA, ACC, PAR], // fees.payments.read
  expenses: [SA, ACC], // expenses.read
  sheets: [SA, OPS, TCH, PAR], // exams.read
  resultOverrides: [SA, OPS], // results.override
  attendance: [SA, OPS, TCH, PAR], // attendance.read
  plannedChapters: [SA, OPS, TCH], // chapters.read
  dailyLessons: [SA, OPS, TCH, PAR], // lessons.read
  slots: [SA, OPS, TCH, PAR], // timetable.read
  teacherAbsences: [SA, OPS, TCH], // absences.read
  substitutions: [SA, OPS, TCH],
  testSchedules: [SA, OPS, TCH, PAR], // tests.read
  weeklyTests: [SA, OPS, TCH, PAR],
  updates: EVERYONE, // updates.read
  audits: [SA, OPS], // audit.read (Ops read-only, fee entries filtered server-side)
}

export function canReadSlice(role: Role | undefined, slice: SchoolDataSlice | "users") {
  return Boolean(role) && SLICE_READ_ROLES[slice].includes(role as Role)
}

/** Slices whose endpoints this role may not read, so syncing skips them (no doomed 403s). */
export function unavailableSlicesFor(role: Role | undefined): ReadonlySet<SchoolDataSlice> {
  if (!role) return new Set()
  return new Set(
    (Object.keys(SLICE_READ_ROLES) as (SchoolDataSlice | "users")[]).filter(
      (slice): slice is SchoolDataSlice => slice !== "users" && !canReadSlice(role, slice)
    )
  )
}

/** Drop the slices a role cannot read. */
export function readableSlices(role: Role | undefined, slices: Iterable<SchoolDataSlice>): SchoolDataSlice[] {
  const blocked = unavailableSlicesFor(role)
  return [...new Set(slices)].filter((slice) => !blocked.has(slice))
}

/** Staff user accounts (/users) are management-only; teachers still load /teachers. */
export function canListUserAccounts(role: Role | undefined) {
  return canReadSlice(role, "users")
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
    return { mode: "partial", slices: readableSlices(role, ["settings"]) }
  }
  const sectionSlices = ADMIN_SECTION_SLICES[section]
  if (!sectionSlices) {
    return { mode: "partial", slices: [] }
  }
  if (NO_DEFAULT_CORE.has(section)) {
    return { mode: "partial", slices: readableSlices(role, sectionSlices) }
  }
  const core = MINIMAL_CORE_SECTIONS.has(section)
    ? (["classes"] as const)
    : PORTAL_CORE_SLICES
  return { mode: "partial", slices: readableSlices(role, [...core, ...sectionSlices]) }
}
