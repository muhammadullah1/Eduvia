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
  type TimetableSlot,
  type UpdateKind,
  type UpdateStatus,
  type WeeklyTest,
  type WeeklyTestStatus,
} from "@/data/types"
import { api } from "@/lib/api"
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
import { ADMISSIONS_LIST_MAX_PAGE_SIZE } from "@/api/admissions/constants"
import { PORTAL_CORE_SLICES, type SchoolDataSlice } from "@/data/portal-sync"
import { getToday } from "@/lib/dates"

async function safeGet<T>(
  path: string,
  query: Record<string, string | number | undefined | null> | undefined,
  fallback: T
): Promise<T> {
  try {
    const res = await api.get<T>(path, query)
    return res ?? fallback
  } catch {
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
      safeGet<ApiSettings>("/settings", undefined, {}),
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
  }

  return { classes, sessions, subjects, settings }
}

async function fetchClassesAndSessions(): Promise<
  Pick<SchoolState, "classes" | "sessions">
> {
  const [classesData, sessionsData] = await Promise.all([
    safeGet<ApiClass[]>("/classes", undefined, []),
    safeGet<ApiSession[]>("/sessions", undefined, []),
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

  return { classes, sessions }
}

function wantsOnlyClassesAndSessions(want: Set<SchoolDataSlice>) {
  return (
    want.has("classes") &&
    want.has("sessions") &&
    !want.has("subjects") &&
    !want.has("settings")
  )
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
    safeGet<{ users: ApiUser[] }>("/users", { pageSize: 1000 }, { users: [] }),
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
  const [feeMonthsData, paymentsData] = await Promise.all([
    safeGet<ApiFeeMonth[]>("/fees/months", undefined, []),
    safeGet<ApiPayment[]>("/fees/payments", undefined, []),
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
])

/** Fetch only the school-state slices requested (avoids loading the whole portal). */
export async function fetchSchoolDataSlices(
  slices: SchoolDataSlice[]
): Promise<Partial<SchoolState>> {
  const want = new Set(slices)
  const partial: Partial<SchoolState> = {}
  const tasks: Promise<void>[] = []

  if (PORTAL_CORE_SLICES.some((slice) => want.has(slice))) {
    if (wantsOnlyClassesAndSessions(want)) {
      tasks.push(
        fetchClassesAndSessions().then((slice) => Object.assign(partial, slice))
      )
    } else {
      tasks.push(fetchPortalCore().then((core) => Object.assign(partial, core)))
    }
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
      fetchBackendState().then((full) => {
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

export async function fetchBackendState(): Promise<SchoolState> {
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
    safeGet<ApiClass[]>("/classes", undefined, []),
    safeGet<ApiSession[]>("/sessions", undefined, []),
    safeGet<ApiSubject[]>("/subjects", undefined, []),
    safeGet<ApiTeacher[]>("/teachers", undefined, []),
    safeGet<{ users: ApiUser[] }>("/users", { pageSize: 1000 }, { users: [] }),
    safeGet<{ students: ApiStudent[] }>(
      "/students",
      { pageSize: 1000 },
      { students: [] }
    ),
    safeGet<{ applications: ApiApplication[] }>(
      "/applications",
      { pageSize: ADMISSIONS_LIST_MAX_PAGE_SIZE },
      { applications: [] }
    ),
    safeGet<ApiFeeMonth[]>("/fees/months", undefined, []),
    safeGet<ApiPayment[]>("/fees/payments", undefined, []),
    safeGet<ApiExpense[]>("/expenses", undefined, []),
    safeGet<ApiExam[]>("/exams", undefined, []),
    safeGet<ApiOverride[]>("/exams/overrides", undefined, []),
    safeGet<ApiAttendance[]>("/attendances", undefined, []),
    safeGet<ApiPlannedChapter[]>("/planned-chapters", undefined, []),
    safeGet<ApiDailyLesson[]>("/daily-lessons", undefined, []),
    safeGet<ApiTimetableSlot[]>("/timetable", undefined, []),
    safeGet<ApiAbsence[]>("/teacher-absences", undefined, []),
    safeGet<ApiSchedule[]>("/daily-tests/schedules", undefined, []),
    safeGet<ApiDailyTest[]>("/daily-tests", undefined, []),
    safeGet<ApiSettings>("/settings", undefined, {}),
    safeGet<ApiUpdate[]>("/updates", undefined, []),
    safeGet<ApiAuditLog[]>("/audit-logs", { limit: 50 }, []),
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

  // 4. Staff
  const teacherStaff: Staff[] = teachersData.map((t) => {
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
      classIds: (t.classes ?? []).map((c) => String(c.id)),
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
  const expenses: Expense[] = expensesData.length
    ? expensesData.map((e) => ({
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
        chapterId: String(l.fkPlannedChapterId),
        classwork: l.classwork ?? "",
        homework: l.homework ?? "",
        remarks: l.remarks ?? "",
        reviewStatus: (l.reviewStatus ?? "Submitted") as ReviewStatus,
        reviewNote: l.reviewNote ?? undefined,
      }))
    : []

  // 15. Timetable Slots
  const slots: TimetableSlot[] = timetableData.length
    ? timetableData.map((slot) => ({
        id: String(slot.id),
        classId: String(slot.fkClassId),
        day: slot.day || (slot as { dayOfWeek?: string }).dayOfWeek || "",
        time: String(
          slot.time || (slot as { startTime?: string }).startTime || ""
        ).slice(0, 5),
        periodIndex: Number(slot.periodIndex) || 1,
        subject: slot.subject.name,
        teacherId: String(slot.fkTeacherId ?? ""),
        teacher: slot.teacher?.user
          ? `${slot.teacher.user.firstName} ${slot.teacher.user.lastName}`.trim()
          : "",
        room: slot.room ?? "Room",
      }))
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
      status: (cover
        ? "Covered"
        : rawStatus === "Approved"
          ? "Pending"
          : rawStatus) as AbsenceStatus,
      markedBy: a.markedBy ?? "",
      notes: a.notes ?? a.reason ?? "",
    }
  })

  const substitutions: Substitution[] = absenceRows.flatMap((a) =>
    coversFor(a).map((sub) => {
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
  )

  // 17. Test Schedules & Weekly Tests
  const testSchedules: TestSchedule[] = schedulesData.length
    ? schedulesData.map((s) => ({
        id: String(s.id),
        classId: String(s.fkClassId),
        subject: s.subject?.name ?? "Mathematics",
        weekday: s.weekday || (s as { dayOfWeek?: string }).dayOfWeek || "",
        periodIndex: Number(s.periodIndex) || 4,
        max: Number(s.maxScore) || 20,
        active: Boolean(s.isActive),
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
