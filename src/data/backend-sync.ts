import {
  DEFAULT_SETTINGS,
  TODAY,
  type AcademicSession,
  type AbsenceStatus,
  type Application,
  type ApplicationStatus,
  type AttendanceMark,
  type AttendanceStatus,
  type AuditEvent,
  type ClassSection,
  type DailyLesson,
  type DocumentStatus,
  type Expense,
  type FeeMonth,
  type MarkSheet,
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

async function safeGet<T>(path: string, query: Record<string, string | number | undefined | null> | undefined, fallback: T): Promise<T> {
  try {
    const res = await api.get<T>(path, query)
    return res ?? fallback
  } catch {
    return fallback
  }
}

export async function fetchBackendState(currentState: SchoolState): Promise<SchoolState> {
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
    safeGet<{ students: ApiStudent[] }>("/students", { pageSize: 1000 }, { students: [] }),
    safeGet<ApiApplication[]>("/applications", undefined, []),
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

  // 1. Classes
  const classes: ClassSection[] = classesData.length
    ? classesData.map((c) => ({
        id: String(c.id),
        label: `${c.grade} · ${c.section}`,
        grade: c.grade,
        section: c.section,
        room: c.room || "Room",
        periodCount: Number(c.periodCount) || 8,
        monthlyFee: Number(c.monthlyFee) || 8500,
      }))
    : currentState.classes

  // 2. Academic Sessions
  const sessions: AcademicSession[] = sessionsData.length
    ? sessionsData.map((s) => ({
        id: String(s.id),
        name: s.name,
        start: s.startDate,
        end: s.endDate,
        current: Boolean(s.isCurrent),
      }))
    : currentState.sessions

  // 3. Subjects
  const subjects: Subject[] = subjectsData.length
    ? subjectsData.map((s) => ({
        id: String(s.id),
        name: s.name,
        code: s.code,
      }))
    : currentState.subjects

  // 4. Staff
  const teacherStaff: Staff[] = teachersData.map((t) => {
    const isHassan = t.user?.email === "hassan@cls.edu.pk"
    return {
      id: isHassan ? "st-hassan" : `st-${t.id}`,
      name: `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.trim() || t.employeeCode,
      role: "Teacher",
      email: t.user?.email ?? "",
      phone: t.user?.phone ?? "",
      subject: t.subject?.name ?? "",
      subjectHistory: [
        {
          subject: t.subject?.name ?? "",
          from: "2026-04-01",
          by: "Imran Shah",
          reason: "Session allocation",
        },
      ],
      classIds: (t.classes ?? []).map((c) => String(c.id)),
    }
  })

  const otherStaff: Staff[] = (usersData.users ?? [])
    .filter((u) => u.role !== "teacher" && u.role !== "parent" && u.role !== "student")
    .map((u) => ({
      id: `st-user-${u.id}`,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      role: u.role === "super_admin" ? "Super Admin" : u.role === "operations_manager" ? "Operations Manager" : "Accountant",
      email: u.email,
      phone: u.phone ?? "",
      subject: "",
      subjectHistory: [],
      classIds: [],
    }))

  const staff: Staff[] = teacherStaff.length || otherStaff.length ? [...teacherStaff, ...otherStaff] : currentState.staff

  // 5. Students
  const students: Student[] = studentsData.students?.length
    ? studentsData.students.map((s) => ({
        id: String(s.id),
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`.trim(),
        classId: String(s.fkClassId || s.class?.id || ""),
        guardian: `${s.lastName} Guardian`,
        phone: "0300-1234567",
        status: (s.status === "Withdrawn" ? "Withdrawn" : s.status === "Pending" ? "Pending" : "Active") as StudentStatus,
        dob: s.dob ? s.dob.slice(0, 10) : "2013-01-01",
        gender: s.gender === "Female" ? "Female" : "Male",
        admittedOn: s.admittedOn ? s.admittedOn.slice(0, 10) : "2026-04-01",
      }))
    : currentState.students

  // 6. Applications
  const applications: Application[] = applicationsData.length
    ? applicationsData.map((a) => ({
        id: `APP-${a.id}`,
        name: a.name,
        classId: String(a.fkClassId ?? ""),
        guardian: a.guardian,
        phone: a.phone,
        dob: a.dob ? a.dob.slice(0, 10) : "2015-01-01",
        gender: a.gender === "Male" ? "Male" : "Female",
        address: a.address ?? "",
        previousSchool: a.previousSchool ?? "",
        previousClass: a.previousClass ?? "",
        guardianRelation: a.guardianRelation ?? "Guardian",
        guardianAddress: a.guardianAddress ?? "",
        documents: (a.documents ?? []).map((d) => ({
          id: String(d.id),
          label: d.label,
          status: d.status as DocumentStatus,
        })),
        interviewType: a.interviewType ?? "",
        interviewDate: a.interviewDate ? a.interviewDate.slice(0, 10) : "",
        interviewScore: a.interviewScore ?? "",
        interviewResult: a.interviewResult ?? "",
        decision: (a.decision as "Admit" | "Reject" | "Waitlist" | "") ?? "",
        status: a.status as ApplicationStatus,
        submittedOn: a.submittedOn ? a.submittedOn.slice(0, 10) : "2026-09-01",
        notes: a.notes ?? "",
      }))
    : currentState.applications

  // 7. Fee Months
  const feeMonths: FeeMonth[] = feeMonthsData.length
    ? feeMonthsData.map((fm) => ({
        id: String(fm.id),
        studentId: String(fm.studentId),
        month: fm.month.slice(0, 7),
        feeType: fm.feeType ?? "Tuition",
        amountDue: Number(fm.amountDue) || 0,
        amountPaid: Number(fm.amountPaid) || 0,
        dueDate: fm.dueDate ? fm.dueDate.slice(0, 10) : `${fm.month.slice(0, 7)}-10`,
      }))
    : currentState.feeMonths

  // 8. Payments
  const payments: Payment[] = paymentsData.length
    ? paymentsData.map((p) => ({
        ref: p.receiptNo,
        studentId: String(p.student?.id ?? ""),
        amount: Number(p.amount) || 0,
        method: p.method || "Cash",
        status: (p.status === "Paid" ? "Paid" : "Pending") as PaymentStatus,
        date: p.paymentDate ? p.paymentDate.slice(0, 10) : TODAY,
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
    : currentState.payments

  // 9. Expenses
  const expenses: Expense[] = expensesData.length
    ? expensesData.map((e) => ({
        id: String(e.id),
        title: e.title,
        category: e.category,
        amount: Number(e.amount) || 0,
        date: e.date ? e.date.slice(0, 10) : TODAY,
      }))
    : currentState.expenses

  // 10. Exams & MarkSheets
  const sheets: MarkSheet[] = []
  if (examsData.length) {
    examsData.forEach((exam) => {
      ;(exam.sheets ?? []).forEach((sheet) => {
        sheets.push({
          id: String(sheet.id),
          examId: String(exam.id),
          examName: exam.name,
          classId: String(exam.fkClassId),
          subject: sheet.subject,
          status: (sheet.status ?? "Draft") as SheetStatus,
          max: Number(sheet.maxScore) || 100,
          feeMonth: exam.feeMonth ? exam.feeMonth.slice(0, 7) : undefined,
          rows: (sheet.rows ?? []).map((r) => ({
            studentId: String(r.fkStudentId),
            score: r.score !== null ? Number(r.score) : null,
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
        grantedBy: o.grantedBy ? `${o.grantedBy.firstName} ${o.grantedBy.lastName}`.trim() : "Principal",
        grantedAt: o.grantedAt,
        revokedAt: o.revokedAt ?? undefined,
      }))
    : currentState.resultOverrides

  // 12. Attendances
  const attendance: AttendanceMark[] = attendancesData.length
    ? attendancesData.map((a) => ({
        studentId: String(a.fkStudentId),
        classId: String(a.fkClassId),
        date: a.date ? a.date.slice(0, 10) : TODAY,
        status: a.status as AttendanceStatus,
      }))
    : currentState.attendance

  // 13. Planned Chapters
  const plannedChapters: PlannedChapter[] = plannedChaptersData.length
    ? plannedChaptersData.map((ch) => ({
        id: String(ch.id),
        classId: String(ch.fkClassId),
        subject: ch.subject?.name ?? "Mathematics",
        sequence: Number(ch.sequence) || 1,
        title: ch.title,
        description: ch.description ?? undefined,
        targetDate: ch.targetDate ? ch.targetDate.slice(0, 10) : undefined,
        createdBy: "Imran Shah",
      }))
    : currentState.plannedChapters

  // 14. Daily Lessons
  const dailyLessons: DailyLesson[] = dailyLessonsData.length
    ? dailyLessonsData.map((l) => ({
        id: String(l.id),
        classId: String(l.fkClassId),
        subject: l.subject?.name ?? "Mathematics",
        teacherId: l.teacher?.user?.email === "hassan@cls.edu.pk" ? "st-hassan" : `st-${l.fkTeacherId}`,
        teacherName: l.teacher?.user ? `${l.teacher.user.firstName} ${l.teacher.user.lastName}`.trim() : "Teacher",
        date: l.date ? l.date.slice(0, 10) : TODAY,
        chapterId: String(l.fkPlannedChapterId),
        classwork: l.classwork ?? "",
        homework: l.homework ?? "",
        remarks: l.remarks ?? "",
        reviewStatus: (l.reviewStatus ?? "Submitted") as ReviewStatus,
        reviewNote: l.reviewNote ?? undefined,
      }))
    : currentState.dailyLessons

  // 15. Timetable Slots
  const slots: TimetableSlot[] = timetableData.length
    ? timetableData.map((slot) => ({
        id: String(slot.id),
        classId: String(slot.fkClassId),
        day: slot.day,
        time: slot.time,
        periodIndex: Number(slot.periodIndex) || 1,
        subject: slot.subject,
        teacherId: slot.teacher === "Hassan Ali" ? "st-hassan" : `st-${slot.fkTeacherId}`,
        teacher: slot.teacher,
        room: slot.room ?? "Room",
      }))
    : currentState.slots

  // 16. Teacher Absences & Substitutions
  const teacherAbsences: TeacherAbsence[] = absencesData.length
    ? absencesData.map((a) => ({
        id: String(a.id),
        teacherId: a.teacher?.user?.email === "hassan@cls.edu.pk" ? "st-hassan" : `st-${a.fkTeacherId}`,
        date: a.date ? a.date.slice(0, 10) : TODAY,
        periodIndex: Number(a.periodIndex) || 1,
        classId: a.fkClassId ? String(a.fkClassId) : undefined,
        subject: a.subject?.name ?? undefined,
        status: (a.status ?? "Pending") as AbsenceStatus,
        markedBy: "Imran Shah",
        notes: a.notes ?? "",
      }))
    : currentState.teacherAbsences

  const substitutions: Substitution[] = absencesData.length
    ? absencesData
        .filter((a) => a.substitution)
        .map((a) => {
          const sub = a.substitution as NonNullable<typeof a.substitution>
          return {
            id: String(sub.id),
            absenceId: String(a.id),
            date: a.date ? a.date.slice(0, 10) : TODAY,
            periodIndex: Number(a.periodIndex) || 1,
            classId: String(a.fkClassId ?? ""),
            subject: a.subject?.name ?? "",
            originalTeacherId: a.teacher?.user?.email === "hassan@cls.edu.pk" ? "st-hassan" : `st-${a.fkTeacherId}`,
            substituteTeacherId:
              sub.substituteTeacher?.user?.email === "hassan@cls.edu.pk" ? "st-hassan" : `st-${sub.fkSubstituteTeacherId}`,
            authorizedBy: sub.authorizedBy ?? "Imran Shah",
            at: sub.createdAt ?? new Date().toISOString(),
          }
        })
    : currentState.substitutions

  // 17. Test Schedules & Weekly Tests
  const testSchedules: TestSchedule[] = schedulesData.length
    ? schedulesData.map((s) => ({
        id: String(s.id),
        classId: String(s.fkClassId),
        subject: s.subject?.name ?? "Mathematics",
        weekday: s.weekday,
        periodIndex: Number(s.periodIndex) || 4,
        max: Number(s.maxScore) || 20,
        active: Boolean(s.isActive),
      }))
    : currentState.testSchedules

  const weeklyTests: WeeklyTest[] = dailyTestsData.length
    ? dailyTestsData.map((t) => ({
        id: String(t.id),
        scheduleId: String(t.fkScheduleId ?? ""),
        classId: String(t.fkClassId),
        subject: t.subject?.name ?? "Mathematics",
        date: t.date ? t.date.slice(0, 10) : TODAY,
        month: t.month ? t.month.slice(0, 7) : TODAY.slice(0, 7),
        week: Number(t.weekOfMonth) || 1,
        max: Number(t.maxScore) || 20,
        status: (t.status ?? "Scheduled") as WeeklyTestStatus,
        results: (t.results ?? []).map((r) => ({
          studentId: String(r.fkStudentId),
          score: r.score !== null ? Number(r.score) : null,
        })),
        enteredBy: t.enteredBy?.name ?? undefined,
        publishedBy: t.publishedBy?.name ?? undefined,
      }))
    : currentState.weeklyTests

  // 18. Settings
  const settings: SchoolSettings = {
    dailyTestRules: settingsData.dailyTestRules ?? currentState.settings.dailyTestRules ?? DEFAULT_SETTINGS.dailyTestRules,
    resultVisibility:
      settingsData.resultVisibility ?? currentState.settings.resultVisibility ?? DEFAULT_SETTINGS.resultVisibility,
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
        due: u.dueDate ? u.dueDate.slice(0, 10) : TODAY,
        author: u.author ?? "School Office",
      }))
    : currentState.updates

  // 20. Audits
  const audits: AuditEvent[] = auditLogsData.length
    ? auditLogsData.map((a) => ({
        id: String(a.id),
        actor: a.actorLabel ?? "System",
        action: a.action,
        at: a.at ?? a.created_at ?? new Date().toISOString(),
        entity: a.entityType ?? undefined,
      }))
    : currentState.audits

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
    sheets: sheets.length ? sheets : currentState.sheets,
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
    syncLogs: currentState.syncLogs,
  }
}
