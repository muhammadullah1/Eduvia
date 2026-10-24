import { api } from "@/lib/api"

/** Statuses stored by the API (SRS 6.3). Present and Late count as attended. */
export type ReviewStatus = "Present" | "Absent" | "Late" | "Leave"

export type TodayClass = {
  classId: number
  classLabel: string
  teacher: string | null
  taken: boolean
  takenAt: string | null
  students: number
  present: number | null
  absent: number | null
  late: number | null
  leave: number | null
  remindedAt: string | null
  /** Explicitly assigned Super Master (responsible for the class all day). */
  superMaster: string | null
  superMasterState: SuperMasterState
  superMasterAbsent: boolean
  /** Today's substitutes covering an absent Super Master in this class. */
  substitutes: string[]
  markedBy: string | null
}
export type SuperMasterState = "assigned" | "unassigned" | "inactive"
export type SuperMasterClass = {
  classId: number
  classLabel: string
  classStatus: string
  state: SuperMasterState
  superMaster: { teacherId: number; name: string; active: boolean } | null
}
export type SuperMasterOverview = { classes: SuperMasterClass[]; teachers: { teacherId: number; name: string }[] }
export type ReminderSent = { teacher: string; superMaster: string; viaSubstitute: boolean; sentAt: string }

export type TodayStatus = { date: string; total: number; taken: number; pending: number; classes: TodayClass[] }

export type DailyStudent = {
  studentId: number
  name: string
  admissionNo: string
  attendanceId: number | null
  status: ReviewStatus | null
  changes: number
}
export type DailyReport = {
  classId: number
  classLabel: string
  date: string
  taken: boolean
  summary: { total: number; present: number; absent: number; late: number; leave: number; unmarked: number }
  editWindowDays: number
  editableUntil: string
  canEdit: boolean
  /** Super Admin may change records outside the edit window. */
  windowBypass?: boolean
  students: DailyStudent[]
}

export type MonthStudent = {
  studentId: number
  name: string
  admissionNo: string
  classId: number
  classLabel: string
  present: number
  absent: number
  late: number
  leave: number
  marked: number
  percent: number | null
  low: boolean
}
export type MonthlyReport = {
  classId: number
  classLabel: string
  month: string
  workingDays: number
  threshold: number
  classPercent: number | null
  students: MonthStudent[]
}

export type Guardian = { name: string | null; relation: string | null; phone: string | null } | null

export type AbsenteeRow = {
  attendanceId: number
  studentId: number
  name: string
  admissionNo: string
  classId: number
  classLabel: string
  status: "Absent" | "Late"
  guardian: Guardian
}
export type AbsenteeList = { date: string; absent: number; late: number; students: AbsenteeRow[] }

export type LowAttendance = {
  month: string
  threshold: number
  defaultThreshold: number
  students: (MonthStudent & { guardian: Guardian })[]
}

export type AttendanceChange = {
  id: number
  date: string
  /** null when the record was created from the review page. */
  from: ReviewStatus | null
  to: ReviewStatus
  reason: string | null
  source: "review" | "register" | "created"
  changedAt: string
  studentId: number
  studentName: string
  admissionNo: string
  classId: number | null
  classLabel: string | null
  actor: { name: string; role: string } | null
}
export type ChangeHistory = { page: number; pageSize: number; total: number; changes: AttendanceChange[] }
export type ChangeHistoryParams = {
  classId?: number
  from?: string
  to?: string
  q?: string
  page?: number
  pageSize?: number
}

export const ATTENDANCE_REVIEW_KEY = "attendance-review"

const attendanceReviewService = {
  today: (date?: string) => api.get<TodayStatus>("/attendances/review/today", { date }),
  daily: (classId: number, date: string) => api.get<DailyReport>("/attendances/review/daily", { classId, date }),
  monthly: (classId: number, month: string) => api.get<MonthlyReport>("/attendances/review/monthly", { classId, month }),
  absentees: (date: string, classId?: number) => api.get<AbsenteeList>("/attendances/review/absentees", { date, classId }),
  low: (month: string, threshold?: number, classId?: number) =>
    api.get<LowAttendance>("/attendances/review/low", { month, threshold, classId }),
  changes: (params: ChangeHistoryParams) => api.get<ChangeHistory>("/attendances/review/changes", params),
  edit: (attendanceId: number, body: { status: ReviewStatus; reason: string }) =>
    api.patch<{ id: number; status: ReviewStatus }>(`/attendances/${attendanceId}`, body),
  create: (body: { studentId: number; classId: number; date: string; status: ReviewStatus; reason: string }) =>
    api.post<{ id: number; status: ReviewStatus }>("/attendances/review/marks", body),
  remind: (classId: number) => api.post<ReminderSent>("/attendances/review/reminders", { classId }),
  superMasters: () => api.get<SuperMasterOverview>("/attendances/review/super-masters"),
  /** Printable paper register (PDF or XLSX) for one class and a day or month. */
  downloadSheet: (params: { classId: string | number; date?: string; month?: string; format: "pdf" | "xlsx" }) =>
    api.download("/attendances/review/sheet", params, `attendance-sheet.${params.format}`),
  assignSuperMaster: (classId: number, teacherId: number | null) =>
    api.put<SuperMasterClass>(`/attendances/review/super-masters/${classId}`, { teacherId }),
  saveThreshold: (lowThreshold: number) => api.put<unknown>("/settings/attendance", { lowThreshold }),
}

export default attendanceReviewService
