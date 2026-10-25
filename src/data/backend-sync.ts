import { ADMISSIONS_LIST_MAX_PAGE_SIZE } from "@/api/admissions/constants"
import {
  type AbsenceRow,
  mapTeacherAbsencesFromApi,
} from "@/api/teacher-absences/map-absences"
import { mapTimetableSlotDto } from "@/api/timetable/map-timetable"
import { canListUserAccounts, canReadSlice, PORTAL_CORE_SLICES, readableSlices, type SchoolDataSlice, unavailableSlicesFor } from "@/data/portal-sync"
import {
  type AbsenceStatus,
  type AcademicSession,
  type Application,
  type AttendanceMark,
  type AttendanceStatus,
  type AuditEvent,
  type ClassSection,
  type DailyLesson,
  DEFAULT_SETTINGS,
  type DocumentStatus,
  type Expense,
  type FeeMonth,
  type MarkSheet,
  normalizeApplicationStatus,
  type Payment,
  type PaymentStatus,
  type PlannedChapter,
  type ResultOverride,
  type ReviewStatus,
  type SchoolSettings,
  type SchoolState,
  type SchoolUpdate,
  type SheetStatus,
  type Staff,
  type Student,
  type StudentStatus,
  type Subject,
  type Substitution,
  type TeacherAbsence,
  type TestSchedule,
  type UpdateKind,
  type UpdateStatus,
  type WeeklyTest,
  type WeeklyTestStatus,
} from "@/data/types"
import { api, ApiHttpError } from "@/lib/api"
import type {
  ApiAbsence,
  ApiApplication,
  ApiAttendance,
  ApiAuditLog,
  ApiClass,
  ApiDailyLesson,
  ApiDailyTest,
  ApiExam,
  ApiExpense,
  ApiFeeMonth,
  ApiOverride,
  ApiPayment,
  ApiPlannedChapter,
  ApiSchedule,
  ApiSession,
  ApiSettings,
  ApiStudent,
  ApiSubject,
  ApiTeacher,
  ApiTimetableSlot,
  ApiUpdate,
  ApiUser,
} from "@/lib/api-types"
import { loadAuth } from "@/lib/auth"
import { getToday } from "@/lib/dates"

/** Paths the signed-in user was refused (403), so later syncs skip them. */
const FORBIDDEN_KEY = "eduvia.sync.forbidden"
const forbiddenPaths = new Set<string>(
  JSON.parse(sessionStorage.getItem(FORBIDDEN_KEY) ?? "[]") as string[]
)

async function safeGet<T>(
  path: string,
  query: Record<string, string | number | undefined | null> | undefined,
  fallback: T
): Promise<T> {
  const key = `${loadAuth()?.user?.id ?? "anon"}:${path}`
  if (forbiddenPaths.has(key)) return fallback
  try {
    const res = await api.get<T>(path, query)
    return res ?? fallback
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 403) {
      forbiddenPaths.add(key)
      sessionStorage.setItem(FORBIDDEN_KEY, JSON.stringify([...forbiddenPaths]))
    }
    return fallback
  }
}

function mapApiApplications(rows: ApiApplication[]): Application[] {
  if (!rows.length) return []
  return rows.map((a) => ({
    id: `APP-${a.id}`,
    name:
      a.name ||
      `${(a as { applicantFirstName?: string }).applicantFirstName ?? ""} ${(a as { applicantLastName?: string }).applicantLastName ?? ""}`.trim(),
    classId: String(a.fkClassId ?? ""),
    classDisplay:
      (a as { gradeApplyingFor?: string }).gradeApplyingFor ||
      (a as { class?: { label?: string } }).class?.label ||
      undefined,
    guardian: a.guardian || (a as { parentName?: string }).parentName || "",
    phone: a.phone || (a as { parentPhone?: string }).parentPhone || "",
    dob: String(
      a.dob || (a as { dateOfBirth?: string }).dateOfBirth || ""
    ).slice(0, 10),
    gender: a.gender === "Male" ? "Male" : "Female",
    address: a.address ?? "",
    previousSchool: a.previousSchool ?? "",
    previousClass: a.previousClass ?? "",
    guardianRelation: a.guardianRelation ?? "Guardian",
    guardianAddress: a.guardianAddress ?? "",
    documents: (a.documents ?? []).map((d) => ({
      id: String(d.id),
      label: d.label || (d as { title?: string }).title || "Document",
      status: (d.status ?? "Uploaded") as DocumentStatus,
    })),
    interviewType: a.interviewType ?? "",
    interviewDate: a.interviewDate ? a.interviewDate.slice(0, 10) : "",
    interviewScore: a.interviewScore ?? "",
    interviewResult: a.interviewResult ?? "",
    decision: (a.decision as "Admit" | "Reject" | "Waitlist" | "") ?? "",
    status: normalizeApplicationStatus(a.status),
    submittedOn: a.submittedOn ? String(a.submittedOn).slice(0, 10) : "",
    notes: a.notes ?? "",
  }))
}

/** Refresh admissions list only (avoids full portal sync after wizard/status updates). */
export async function fetchApplicationsList(): Promise<Application[]> {
  const data = await safeGet<{ applications: ApiApplication[] }>(
    "/applications",
    { pageSize: ADMISSIONS_LIST_MAX_PAGE_SIZE },
    { applications: [] }
  )
  return mapApiApplications(data.applications ?? [])
}

export async function fetchPortalCore(): Promise<
  Pick<SchoolState, "classes" | "sessions" | "subjects" | "settings">
> {
  const [classesData, sessionsData, subjectsData, settingsData] =
    await Promise.all([
      safeGet<ApiClass[]>("/classes", undefined, []),
      safeGet<ApiSession[]>("/sessions", undefined, []),
      safeGet<ApiSubject[]>("/subjects", undefined, []),
      canReadSlice(loadAuth()?.role, "settings")
        ? safeGet<ApiSettings>("/settings", undefined, {})
        : Promise.resolve({} as ApiSettings),
    ])

  const classes: ClassSection[] = classesData.length
    ? classesData.map((c) => ({
        id: String(c.id),
        label: `${c.grade} · ${c.section}`,
        grade: c.grade,
        section: c.section,
        room: c.room || "Room",
        periodCount: Number(c.periodCount) || 8,
        monthlyFee:
          Number(
            (c as { monthlyTuitionFee?: string | number }).monthlyTuitionFee ??
              c.monthlyFee
          ) || 0,
      }))
    : []

  const sessions: AcademicSession[] = sessionsData.length
    ? sessionsData.map((s) => ({
        id: String(s.id),
        name: s.name,
        start: s.startDate,
        end: s.endDate,
        current: Boolean(s.isCurrent),
      }))
    : []

  const subjects: Subject[] = subjectsData.length
    ? subjectsData.map((s) => ({
        id: String(s.id),
        name: s.name,
        code: s.code,
      }))
    : []

  const settings: SchoolSettings = {
    dailyTestRules:
      settingsData.dailyTestRules ?? DEFAULT_SETTINGS.dailyTestRules,
    resultVisibility:
      settingsData.resultVisibility ?? DEFAULT_SETTINGS.resultVisibility,
    fees: settingsData.fees ?? DEFAULT_SETTINGS.fees,
    attendance: settingsData.attendance ?? DEFAULT_SETTINGS.attendance,
    admission: settingsData.admission ?? DEFAULT_SETTINGS.admission,
  }

  return { classes, sessions, subjects, settings }
}

async function fetchRequestedCore(
  want: Set<SchoolDataSlice>
): Promise<Partial<SchoolState>> {
  const [classesData, sessionsData, subjectsData, settingsData] =
    await Promise.all([
      want.has("classes")
        ? safeGet<ApiClass[]>("/classes", undefined, [])
        : Promise.resolve([] as ApiClass[]),
      want.has("sessions")
        ? safeGet<ApiSession[]>("/sessions", undefined, [])
        : Promise.resolve([] as ApiSession[]),
      want.has("subjects")
        ? safeGet<ApiSubject[]>("/subjects", undefined, [])
        : Promise.resolve([] as ApiSubject[]),
      want.has("settings")
        ? safeGet<ApiSettings>("/settings", undefined, {})
        : Promise.resolve({} as ApiSettings),
    ])

  const partial: Partial<SchoolState> = {}
  if (want.has("classes")) {
    partial.classes = classesData.map((c) => ({
      id: String(c.id),
      label: `${c.grade} · ${c.section}`,
      grade: c.grade,
      section: c.section,
      room: c.room || "Room",
      periodCount: Number(c.periodCount) || 8,
      monthlyFee:
        Number(
          (c as { monthlyTuitionFee?: string | number }).monthlyTuitionFee ??
            c.monthlyFee
        ) || 0,
    }))
  }
  if (want.has("sessions")) {
    partial.sessions = sessionsData.map((s) => ({
      id: String(s.id),
      name: s.name,
      start: s.startDate,
      end: s.endDate,
      current: Boolean(s.isCurrent),
    }))
  }
  if (want.has("subjects")) {
    partial.subjects = subjectsData.map((s) => ({
      id: String(s.id),
      name: s.name,
      code: s.code,
    }))
  }
  if (want.has("settings")) {
    partial.settings = {
      dailyTestRules:
        settingsData.dailyTestRules ?? DEFAULT_SETTINGS.dailyTestRules,
      resultVisibility:
        settingsData.resultVisibility ?? DEFAULT_SETTINGS.resultVisibility,
      fees: settingsData.fees ?? DEFAULT_SETTINGS.fees,
      attendance: settingsData.attendance ?? DEFAULT_SETTINGS.attendance,
      admission: settingsData.admission ?? DEFAULT_SETTINGS.admission,
    }
  }
  return partial
}

async function fetchTimetableSlotsFromApi(): Promise<Pick<SchoolState, "slots">> {
  const timetableData = await safeGet<ApiTimetableSlot[]>(
    "/timetable",
    undefined,
    []
  )
  const slots = timetableData.length
    ? timetableData.map((slot) => mapTimetableSlotDto(slot))
    : []
  return { slots }
}

async function fetchTeacherAbsencesBundle(): Promise<
  Pick<SchoolState, "teacherAbsences" | "substitutions">
> {
  const absencesData = await safeGet<AbsenceRow[]>(
    "/teacher-absences",
    undefined,
    []
  )
  return mapTeacherAbsencesFromApi(absencesData)
}

async function fetchStudentsFromApi(): Promise<Student[]> {
  const studentsData = await safeGet<{ students: ApiStudent[] }>(
    "/students",
    { pageSize: 1000 },
    { students: [] }
  )
  return studentsData.students?.length
    ? studentsData.students.map((s) => ({
        id: String(s.id),
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`.trim(),
        classId: String(s.fkClassId || s.class?.id || ""),
        guardian: s.lastName,
        phone: "",
        status: (s.status === "Withdrawn"
          ? "Withdrawn"
          : "Active") as StudentStatus,
        dob: String(
          (s as { dateOfBirth?: string }).dateOfBirth || s.dob || ""
        ).slice(0, 10),
        gender: s.gender === "Female" ? "Female" : "Male",
        admittedOn: String(
          (s as { admissionDate?: string }).admissionDate || s.admittedOn || ""
        ).slice(0, 10),
      }))
    : []
}

async function fetchStaffFromApi(): Promise<Staff[]> {
  const [teachersData, usersData] = await Promise.all([
    safeGet<ApiTeacher[]>("/teachers", undefined, []),
    canListUserAccounts(loadAuth()?.role)
      ? safeGet<{ users: ApiUser[] }>("/users", { pageSize: 1000 }, { users: [] })
      : Promise.resolve({ users: [] as ApiUser[] }),
  ])

  const teacherStaff: Staff[] = teachersData.map((t) => ({
    id: String(t.id),
    name:
      `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.trim() ||
      t.employeeCode,
    role: "Teacher",
    email: t.user?.email ?? "",
    phone: t.user?.phone ?? "",
    subject: t.subject?.name ?? "",
    subjectHistory: t.subject?.name
      ? [
          {
            subject: t.subject.name,
            from: String(
              (t as { joiningDate?: string }).joiningDate || "2026-04-01"
            ).slice(0, 10),
            by: "School office",
          },
        ]
      : [],
    classIds: (t.classes ?? []).map((c) => String(c.id)),
  }))

  const otherStaff: Staff[] = (usersData.users ?? [])
    .filter(
      (u) => u.role !== "teacher" && u.role !== "parent" && u.role !== "student"
    )
    .map((u) => ({
      id: `st-user-${u.id}`,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      role:
        u.role === "super_admin"
          ? "Super Admin"
          : u.role === "operations_manager"
            ? "Operations Manager"
            : "Accountant",
      email: u.email,
      phone: u.phone ?? "",
      subject: "",
      subjectHistory: [],
      classIds: [],
    }))

  return [...teacherStaff, ...otherStaff]
}

async function fetchFeesFromApi(): Promise<
  Pick<SchoolState, "feeMonths" | "payments">
> {
  const today = getToday()
  const role = loadAuth()?.role
  const [feeMonthsData, paymentsData] = await Promise.all([
    canReadSlice(role, "feeMonths")
      ? safeGet<ApiFeeMonth[]>("/fees/months", undefined, [])
      : Promise.resolve([] as ApiFeeMonth[]),
    canReadSlice(role, "payments")
      ? safeGet<ApiPayment[]>("/fees/payments", undefined, [])
      : Promise.resolve([] as ApiPayment[]),
  ])

  const feeMonths: FeeMonth[] = feeMonthsData.length
    ? feeMonthsData.map((fm) => ({
        id: String(fm.id),
        studentId: String(fm.studentId),
        month: fm.month.slice(0, 7),
        feeType: fm.feeType ?? "Tuition",
        amountDue: Number(fm.amountDue) || 0,
        amountPaid: Number(fm.amountPaid) || 0,
        dueDate: fm.dueDate
          ? fm.dueDate.slice(0, 10)
          : `${fm.month.slice(0, 7)}-10`,
      }))
    : []

  const payments: Payment[] = paymentsData.length
    ? paymentsData.map((p) => ({
        ref: p.receiptNo,
        studentId: String(p.student?.id ?? ""),
        amount: Number(p.amount) || 0,
        method: p.method || "Cash",
        status: (p.status === "Paid" ? "Paid" : "Pending") as PaymentStatus,
        date: p.paymentDate ? p.paymentDate.slice(0, 10) : today,
        recordedBy: p.recordedBy?.name ?? "School Office",
        recordedByRole: "Accountant",
        allocations: (p.feeMonths ?? []).map((fm) => ({
          feeMonthId: String(fm.id ?? ""),
          month: fm.month.slice(0, 7),
          amount: Number(fm.amount) || 0,
        })),
        unallocated: Number(p.unallocatedAmount) || 0,
        mode: p.allocationMode === "manual" ? "manual" : "auto",
        note: p.notes ?? undefined,
        idempotencyKey: p.idempotencyKey ?? undefined,
      }))
    : []

  return { feeMonths, payments }
}

const LIGHT_FETCH_SLICES = new Set<SchoolDataSlice>([
  ...PORTAL_CORE_SLICES,
  "applications",
  "students",
  "staff",
  "feeMonths",
  "payments",
  "slots",
  "teacherAbsences",
  "substitutions",
])

/** Fetch only the school-state slices requested (avoids loading the whole portal). */
export async function fetchSchoolDataSlices(
  slices: SchoolDataSlice[]
): Promise<Partial<SchoolState>> {
  // Never request a slice the signed-in role cannot read (the API would answer 403).
  const want = new Set(readableSlices(loadAuth()?.role, slices))
  if (want.size === 0) return {}
  const partial: Partial<SchoolState> = {}
  const tasks: Promise<void>[] = []

  if (PORTAL_CORE_SLICES.some((slice) => want.has(slice))) {
    tasks.push(
      fetchRequestedCore(want).then((core) => {
        Object.assign(partial, core)
      })
    )
  }
  if (want.has("slots")) {
    tasks.push(
      fetchTimetableSlotsFromApi().then((slice) => {
        Object.assign(partial, slice)
      })
    )
  }
  if (want.has("teacherAbsences") || want.has("substitutions")) {
    tasks.push(
      fetchTeacherAbsencesBundle().then((bundle) => {
        partial.teacherAbsences = bundle.teacherAbsences
        partial.substitutions = bundle.substitutions
      })
    )
  }
  if (want.has("applications")) {
    tasks.push(
      fetchApplicationsList().then((applications) => {
        partial.applications = applications
      })
    )
  }
  if (want.has("students")) {
    tasks.push(
      fetchStudentsFromApi().then((students) => {
        partial.students = students
      })
    )
  }
  if (want.has("staff")) {
    tasks.push(
      fetchStaffFromApi().then((staff) => {
        partial.staff = staff
      })
    )
  }
  if (want.has("feeMonths") || want.has("payments")) {
    tasks.push(
      fetchFeesFromApi().then((fees) => {
        partial.feeMonths = fees.feeMonths
        partial.payments = fees.payments
      })
    )
  }

  const heavy = [...want].filter((slice) => !LIGHT_FETCH_SLICES.has(slice))
  if (heavy.length > 0) {
    tasks.push(
      fetchBackendState(new Set(heavy)).then((full) => {
        for (const key of heavy) {
          if (key in full) {
            (partial as Record<string, unknown>)[key] = full[key as keyof SchoolState]
          }
        }
      })
    )
  }

  await Promise.all(tasks)
  return partial
}

export async function fetchBackendState(
  only?: ReadonlySet<SchoolDataSlice>
): Promise<SchoolState> {
  const role = loadAuth()?.role
  const unavailable = unavailableSlicesFor(role)
  const need = (slice: SchoolDataSlice) => (!only || only.has(slice)) && !unavailable.has(slice)
  const [
    classesData,
    sessionsData,
    subjectsData,
    teachersData,
    usersData,
    studentsData,
    applicationsData,
    feeMonthsData,
    paymentsData,
    expensesData,
    examsData,
    overridesData,
    attendancesData,
    plannedChaptersData,
    dailyLessonsData,
    timetableData,
    absencesData,
    schedulesData,
    dailyTestsData,
    settingsData,
    updatesData,
    auditLogsData,
  ] = await Promise.all([
    need("classes")
      ? safeGet<ApiClass[]>("/classes", undefined, [])
      : Promise.resolve([] as ApiClass[]),
    need("sessions")
      ? safeGet<ApiSession[]>("/sessions", undefined, [])
      : Promise.resolve([] as ApiSession[]),
    need("subjects")
      ? safeGet<ApiSubject[]>("/subjects", undefined, [])
      : Promise.resolve([] as ApiSubject[]),
    need("staff")
      ? safeGet<ApiTeacher[]>("/teachers", undefined, [])
      : Promise.resolve([] as ApiTeacher[]),
    need("staff") && canListUserAccounts(role)
      ? safeGet<{ users: ApiUser[] }>("/users", { pageSize: 1000 }, { users: [] })
      : Promise.resolve({ users: [] as ApiUser[] }),
    need("students")
      ? safeGet<{ students: ApiStudent[] }>(
          "/students",
          { pageSize: 1000 },
          { students: [] }
        )
      : Promise.resolve({ students: [] as ApiStudent[] }),
    need("applications")
      ? safeGet<{ applications: ApiApplication[] }>(
          "/applications",
          { pageSize: ADMISSIONS_LIST_MAX_PAGE_SIZE },
          { applications: [] }
        )
      : Promise.resolve({ applications: [] as ApiApplication[] }),
    need("feeMonths")
      ? safeGet<ApiFeeMonth[]>("/fees/months", undefined, [])
      : Promise.resolve([] as ApiFeeMonth[]),
    need("payments")
      ? safeGet<ApiPayment[]>("/fees/payments", undefined, [])
      : Promise.resolve([] as ApiPayment[]),
    need("expenses")
      ? safeGet<ApiExpense[]>("/expenses", undefined, [])
      : Promise.resolve([] as ApiExpense[]),
    need("sheets")
      ? safeGet<ApiExam[]>("/exams", undefined, [])
      : Promise.resolve([] as ApiExam[]),
    need("resultOverrides")
      ? safeGet<ApiOverride[]>("/exams/overrides", undefined, [])
      : Promise.resolve([] as ApiOverride[]),
    need("attendance")
      ? safeGet<ApiAttendance[]>("/attendances", undefined, [])
      : Promise.resolve([] as ApiAttendance[]),
    need("plannedChapters")
      ? safeGet<ApiPlannedChapter[]>("/planned-chapters", undefined, [])
      : Promise.resolve([] as ApiPlannedChapter[]),
    need("dailyLessons")
      ? safeGet<ApiDailyLesson[]>("/daily-lessons", undefined, [])
      : Promise.resolve([] as ApiDailyLesson[]),
    need("slots")
      ? safeGet<ApiTimetableSlot[]>("/timetable", undefined, [])
      : Promise.resolve([] as ApiTimetableSlot[]),
    need("teacherAbsences") || need("substitutions")
      ? safeGet<ApiAbsence[]>("/teacher-absences", undefined, [])
      : Promise.resolve([] as ApiAbsence[]),
    need("testSchedules")
      ? safeGet<ApiSchedule[]>("/daily-tests/schedules", undefined, [])
      : Promise.resolve([] as ApiSchedule[]),
    need("weeklyTests")
      ? safeGet<ApiDailyTest[]>("/daily-tests", undefined, [])
      : Promise.resolve([] as ApiDailyTest[]),
    need("settings")
      ? safeGet<ApiSettings>("/settings", undefined, {})
      : Promise.resolve({} as ApiSettings),
    need("updates")
      ? safeGet<ApiUpdate[]>("/updates", undefined, [])
      : Promise.resolve([] as ApiUpdate[]),
    need("audits")
      ? safeGet<ApiAuditLog[]>("/audit-logs", { limit: 50 }, [])
      : Promise.resolve([] as ApiAuditLog[]),
  ])

  const today = getToday()

  // 1. Classes
  const classes: ClassSection[] = classesData.length
    ? classesData.map((c) => ({
        id: String(c.id),
        label: `${c.grade} · ${c.section}`,
        grade: c.grade,
        section: c.section,
        room: c.room || "Room",
        periodCount: Number(c.periodCount) || 8,
        monthlyFee:
          Number(
            (c as { monthlyTuitionFee?: string | number }).monthlyTuitionFee ??
              c.monthlyFee
          ) || 0,
      }))
    : []

  // 2. Academic Sessions
  const sessions: AcademicSession[] = sessionsData.length
    ? sessionsData.map((s) => ({
        id: String(s.id),
        name: s.name,
        start: s.startDate,
        end: s.endDate,
        current: Boolean(s.isCurrent),
      }))
    : []

  // 3. Subjects
  const subjects: Subject[] = subjectsData.length
    ? subjectsData.map((s) => ({
        id: String(s.id),
        name: s.name,
        code: s.code,
      }))
    : []

  // 4. Staff. Teachers with no explicit class links teach the classes their
  // timetable periods are in.
  const timetableClassIds = new Map<number, Set<string>>()
  for (const slot of timetableData) {
    if (slot.fkTeacherId == null) continue
    const ids = timetableClassIds.get(slot.fkTeacherId) ?? new Set<string>()
    ids.add(String(slot.fkClassId))
    timetableClassIds.set(slot.fkTeacherId, ids)
  }
  const teacherStaff: Staff[] = teachersData.map((t) => {
    const linked = (t.classes ?? []).map((c) => String(c.id))
    return {
      id: String(t.id),
      name:
        `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.trim() ||
        t.employeeCode,
      role: "Teacher",
      email: t.user?.email ?? "",
      phone: t.user?.phone ?? "",
      subject: t.subject?.name ?? "",
      subjectHistory: t.subject?.name
        ? [
            {
              subject: t.subject.name,
              from: String(
                (t as { joiningDate?: string }).joiningDate || "2026-04-01"
              ).slice(0, 10),
              by: "School office",
            },
          ]
        : [],
      classIds: linked.length
        ? linked
        : [...(timetableClassIds.get(t.id) ?? [])],
    }
  })

  const otherStaff: Staff[] = (usersData.users ?? [])
    .filter(
      (u) => u.role !== "teacher" && u.role !== "parent" && u.role !== "student"
    )
    .map((u) => ({
      id: `st-user-${u.id}`,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      role:
        u.role === "super_admin"
          ? "Super Admin"
          : u.role === "operations_manager"
            ? "Operations Manager"
            : "Accountant",
      email: u.email,
      phone: u.phone ?? "",
      subject: "",
      subjectHistory: [],
      classIds: [],
    }))

  const staff: Staff[] = [...teacherStaff, ...otherStaff]

  // 5. Students
  const students: Student[] = studentsData.students?.length
    ? studentsData.students.map((s) => ({
        id: String(s.id),
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`.trim(),
        classId: String(s.fkClassId || s.class?.id || ""),
        guardian: s.lastName,
        phone: "",
        status: (s.status === "Withdrawn"
          ? "Withdrawn"
          : "Active") as StudentStatus,
        dob: String(
          (s as { dateOfBirth?: string }).dateOfBirth || s.dob || ""
        ).slice(0, 10),
        gender: s.gender === "Female" ? "Female" : "Male",
        admittedOn: String(
          (s as { admissionDate?: string }).admissionDate || s.admittedOn || ""
        ).slice(0, 10),
      }))
    : []

  // 6. Applications
  const applications = mapApiApplications(applicationsData.applications ?? [])

  // 7. Fee Months
  const feeMonths: FeeMonth[] = feeMonthsData.length
    ? feeMonthsData.map((fm) => ({
        id: String(fm.id),
        studentId: String(fm.studentId),
        month: fm.month.slice(0, 7),
        feeType: fm.feeType ?? "Tuition",
        amountDue: Number(fm.amountDue) || 0,
        amountPaid: Number(fm.amountPaid) || 0,
        dueDate: fm.dueDate
          ? fm.dueDate.slice(0, 10)
          : `${fm.month.slice(0, 7)}-10`,
      }))
    : []

  // 8. Payments
  const payments: Payment[] = paymentsData.length
    ? paymentsData.map((p) => ({
        ref: p.receiptNo,
        studentId: String(p.student?.id ?? ""),
        amount: Number(p.amount) || 0,
        method: p.method || "Cash",
        status: (p.status === "Paid" ? "Paid" : "Pending") as PaymentStatus,
        date: p.paymentDate ? p.paymentDate.slice(0, 10) : today,
        recordedBy: p.recordedBy?.name ?? "School Office",
        recordedByRole: "Accountant",
        allocations: (p.feeMonths ?? []).map((fm) => ({
          feeMonthId: String(fm.id ?? ""),
          month: fm.month.slice(0, 7),
          amount: Number(fm.amount) || 0,
        })),
        unallocated: Number(p.unallocatedAmount) || 0,
        mode: p.allocationMode === "manual" ? "manual" : "auto",
        note: p.notes ?? undefined,
        idempotencyKey: p.idempotencyKey ?? undefined,
      }))
    : []

  // 9. Expenses
  // Step 8: `/expenses` returns `{ rows, totals }` (React Query in features/finance); older array responses still map.
  const expenseRows: ApiExpense[] = Array.isArray(expensesData) ? expensesData : []
  const expenses: Expense[] = expenseRows.length
    ? expenseRows.map((e) => ({
        id: String(e.id),
        title: e.title,
        category: e.category,
        amount: Number(e.amount) || 0,
        date: String(
          e.date || (e as { expenseDate?: string }).expenseDate || ""
        ).slice(0, 10),
      }))
    : []

  // 10. Exams & MarkSheets
  const sheets: MarkSheet[] = []
  if (examsData.length) {
    examsData.forEach((exam) => {
      const sheetsOnExam =
        exam.sheets ??
        (exam as { markSheets?: typeof exam.sheets }).markSheets ??
        []
      sheetsOnExam.forEach((sheet) => {
        const subjectName = sheet.subject.name || "Subject"
        const rawStatus =
          sheet.status === "Approved" ? "Verified" : sheet.status
        sheets.push({
          id: String(sheet.id),
          examId: String(exam.id),
          examName: exam.name,
          classId: String(
            (sheet as { fkClassId?: number }).fkClassId ?? exam.fkClassId ?? ""
          ),
          subject: subjectName,
          status: (rawStatus ?? "Draft") as SheetStatus,
          max:
            Number(
              sheet.maxScore ?? (sheet as { totalMarks?: number }).totalMarks
            ) || 100,
          feeMonth:
            (
              exam.feeMonth ||
              (exam as { requiredFeeMonth?: string }).requiredFeeMonth ||
              ""
            ).slice(0, 7) || undefined,
          rows: (sheet.rows ?? []).map((r) => ({
            studentId: String(r.fkStudentId),
            score:
              r.score != null
                ? Number(r.score)
                : (r as { obtainedMarks?: number | null }).obtainedMarks != null
                  ? Number((r as { obtainedMarks?: number }).obtainedMarks)
                  : null,
          })),
        })
      })
    })
  }

  // 11. Result Overrides
  const resultOverrides: ResultOverride[] = overridesData.length
    ? overridesData.map((o) => ({
        id: String(o.id),
        examId: String(o.fkExamId),
        studentId: String(o.fkStudentId),
        reason: o.reason,
        grantedBy: o.grantedBy
          ? `${o.grantedBy.firstName} ${o.grantedBy.lastName}`.trim()
          : "Principal",
        grantedAt: o.grantedAt,
        revokedAt: o.revokedAt ?? undefined,
      }))
    : []

  // 12. Attendances
  const attendance: AttendanceMark[] = attendancesData.length
    ? attendancesData.map((a) => ({
        studentId: String(a.fkStudentId),
        classId: String(a.fkClassId),
        date: a.date ? a.date.slice(0, 10) : today,
        status: a.status as AttendanceStatus,
      }))
    : []

  // 13. Planned Chapters
  const plannedChapters: PlannedChapter[] = plannedChaptersData.length
    ? plannedChaptersData.map((ch) => ({
        id: String(ch.id),
        classId: String(ch.fkClassId),
        subject: ch.subject?.name ?? "Mathematics",
        sequence:
          Number(ch.sequence || (ch as { chapterNo?: number }).chapterNo) || 1,
        title: ch.title,
        description: ch.description ?? undefined,
        targetDate: ch.targetDate ? ch.targetDate.slice(0, 10) : undefined,
        createdBy: "Imran Shah",
      }))
    : []

  // 14. Daily Lessons
  const dailyLessons: DailyLesson[] = dailyLessonsData.length
    ? dailyLessonsData.map((l) => ({
        id: String(l.id),
        classId: String(l.fkClassId),
        subject: l.subject?.name ?? "Mathematics",
        teacherId: String(l.fkTeacherId ?? l.teacher?.id ?? ""),
        teacherName: l.teacher?.user
          ? `${l.teacher.user.firstName} ${l.teacher.user.lastName}`.trim()
          : "Teacher",
        date: l.date ? l.date.slice(0, 10) : today,
        chapterId: String(l.fkChapterId ?? l.fkPlannedChapterId ?? ""),
        classwork: l.classwork ?? "",
        homework: l.homework ?? "",
        remarks: l.remarks ?? "",
        reviewStatus: (l.reviewStatus ?? "Submitted") as ReviewStatus,
        reviewNote: l.reviewNote ?? undefined,
      }))
    : []

  // 15. Timetable Slots (authoritative: GET /timetable)
  const slots = timetableData.length
    ? timetableData.map((slot) => mapTimetableSlotDto(slot))
    : []

  // 16. Teacher Absences & Substitutions
  type CoverSlot = {
    periodIndex?: number
    fkClassId?: number
    subject?: { name?: string }
  }
  type Cover = NonNullable<ApiAbsence["substitution"]> & {
    periodIndex?: number
    slot?: CoverSlot
    substituteTeacher?: NonNullable<
      ApiAbsence["substitution"]
    >["substituteTeacher"] & { id?: number }
  }
  type AbsenceRow = ApiAbsence & {
    reason?: string
    markedBy?: string
    teacher?: ApiAbsence["teacher"] & { id?: number }
    substitutions?: Cover[]
  }
  const absenceRows = absencesData as AbsenceRow[]
  const coversFor = (row: AbsenceRow) => [
    ...(row.substitution ? [row.substitution as Cover] : []),
    ...(row.substitutions ?? []),
  ]

  const teacherAbsences: TeacherAbsence[] = absenceRows.map((a) => {
    const cover = coversFor(a)[0]
    const slot = cover?.slot
    const rawStatus = String(a.status ?? "Pending")
    let status: AbsenceStatus = rawStatus as AbsenceStatus
    if (rawStatus === "Cancelled") status = "Cancelled"
    else if (cover) status = "Covered"
    else if (rawStatus === "Approved") status = "Pending"

    return {
      id: String(a.id),
      teacherId: String(a.fkTeacherId ?? a.teacher?.id ?? ""),
      date: a.date ? a.date.slice(0, 10) : today,
      periodIndex:
        Number(a.periodIndex || slot?.periodIndex || cover?.periodIndex) || 1,
      classId: a.fkClassId
        ? String(a.fkClassId)
        : slot?.fkClassId
          ? String(slot.fkClassId)
          : undefined,
      subject: a.subject?.name ?? slot?.subject?.name,
      status,
      markedBy: a.markedBy ?? "",
      notes: a.notes ?? a.reason ?? "",
    }
  })

  const substitutions: Substitution[] = absenceRows.flatMap((a) => {
    if (String(a.status ?? "") === "Cancelled") return []
    return coversFor(a).map((sub) => {
      const slot = sub.slot
      return {
        id: String(sub.id),
        absenceId: String(a.id),
        date: a.date ? a.date.slice(0, 10) : today,
        periodIndex: Number(sub.periodIndex || slot?.periodIndex) || 1,
        classId: String(a.fkClassId ?? slot?.fkClassId ?? ""),
        subject: a.subject?.name ?? slot?.subject?.name ?? "",
        originalTeacherId: String(a.fkTeacherId ?? a.teacher?.id ?? ""),
        substituteTeacherId: String(
          sub.fkSubstituteTeacherId ?? sub.substituteTeacher?.id ?? ""
        ),
        authorizedBy:
          typeof sub.authorizedBy === "string" ? sub.authorizedBy : "",
        at: sub.createdAt ?? new Date().toISOString(),
      }
    })
  })

  // 17. Test Schedules & Weekly Tests
  const testSchedules: TestSchedule[] = schedulesData.length
    ? schedulesData.map((s) => ({
        id: String(s.id),
        classId: String(s.fkClassId),
        subject: s.subject?.name ?? "Mathematics",
        weekday: s.weekday || (s as { dayOfWeek?: string }).dayOfWeek || "",
        periodIndex: Number(s.periodIndex) || 4,
        max: Number(s.maxScore) || 20,
        active: s.isActive == null ? true : Boolean(s.isActive),
      }))
    : []

  const weeklyTests: WeeklyTest[] = dailyTestsData.length
    ? dailyTestsData.map((t) => ({
        id: String(t.id),
        scheduleId: String(t.fkScheduleId ?? ""),
        classId: String(t.fkClassId),
        subject: t.subject?.name ?? "Mathematics",
        date: t.date ? t.date.slice(0, 10) : today,
        month: t.month ? t.month.slice(0, 7) : today.slice(0, 7),
        week: Number(t.weekOfMonth) || 1,
        max:
          Number(t.maxScore ?? (t as { totalMarks?: number }).totalMarks) || 20,
        status: (t.status ??
          ((t.results ?? []).length
            ? "Published"
            : "Scheduled")) as WeeklyTestStatus,
        results: (t.results ?? []).map((r) => ({
          studentId: String(r.fkStudentId),
          score:
            r.score != null
              ? Number(r.score)
              : (r as { obtainedMarks?: number | null }).obtainedMarks != null
                ? Number((r as { obtainedMarks?: number }).obtainedMarks)
                : null,
        })),
        enteredBy: t.enteredBy?.name ?? undefined,
        publishedBy: t.publishedBy?.name ?? undefined,
      }))
    : []

  // 18. Settings
  const settings: SchoolSettings = {
    dailyTestRules:
      settingsData.dailyTestRules ?? DEFAULT_SETTINGS.dailyTestRules,
    resultVisibility:
      settingsData.resultVisibility ?? DEFAULT_SETTINGS.resultVisibility,
    fees: settingsData.fees ?? DEFAULT_SETTINGS.fees,
    attendance: settingsData.attendance ?? DEFAULT_SETTINGS.attendance,
    admission: settingsData.admission ?? DEFAULT_SETTINGS.admission,
  }

  // 19. Updates
  const updates: SchoolUpdate[] = updatesData.length
    ? updatesData.map((u) => ({
        id: String(u.id),
        classId: String(u.fkClassId),
        kind: (u.kind ?? "Notice") as UpdateKind,
        subject: u.subject ?? "General",
        text: u.text,
        status: (u.status ?? "Draft") as UpdateStatus,
        due: u.dueDate ? u.dueDate.slice(0, 10) : today,
        author: u.author ?? "School Office",
      }))
    : []

  // 20. Audits
  const audits: AuditEvent[] = auditLogsData.length
    ? auditLogsData.map((a) => ({
        id: String(a.id),
        actor: a.actorLabel ?? "System",
        action: a.action,
        at: a.at ?? a.created_at ?? new Date().toISOString(),
        entity: a.entityType ?? undefined,
      }))
    : []

  return {
    sessions,
    classes,
    subjects,
    staff,
    students,
    applications,
    feeMonths,
    payments,
    expenses,
    sheets,
    resultOverrides,
    attendance,
    plannedChapters,
    dailyLessons,
    slots,
    teacherAbsences,
    substitutions,
    testSchedules,
    weeklyTests,
    settings,
    updates,
    audits,
    syncLogs: [],
  }
}
