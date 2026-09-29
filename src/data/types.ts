export type StudentStatus = "Active" | "Pending" | "Withdrawn"
export type ApplicationStatus = "New" | "Review" | "Waitlist" | "Enrolled" | "Rejected"
export type PaymentStatus = "Paid" | "Pending"
export type AttendanceStatus = "Present" | "Absent" | "Leave"
export type LessonStatus = "Completed" | "In progress" | "Planned"
export type UpdateKind = "Homework" | "Classwork" | "Notice"
export type UpdateStatus = "Draft" | "Approved" | "Published" | "Rejected"
export type SheetStatus = "Draft" | "Submitted" | "Verified" | "Published"

export type ClassSection = {
  id: string
  label: string
  grade: string
  section: string
  room: string
  /** Configurable periods per day (7, 8, 9, …). */
  periodCount: number
}

export type Subject = {
  id: string
  name: string
  code: string
}

export type Staff = {
  id: string
  name: string
  role: string
  email: string
  phone: string
  /** Preferred 1:1 primary subject (editable). */
  primarySubject: string
  subjects: string[]
  classIds: string[]
}

export type Student = {
  id: string
  name: string
  classId: string
  guardian: string
  phone: string
  status: StudentStatus
  dob: string
  gender: "Female" | "Male"
  admittedOn: string
}

export type DocumentStatus = "Pending" | "Uploaded" | "Verified"

export type AdmissionDocument = {
  id: string
  label: string
  status: DocumentStatus
}

export type Application = {
  id: string
  name: string
  classId: string
  guardian: string
  phone: string
  dob: string
  gender: "Female" | "Male"
  address: string
  previousSchool: string
  previousClass: string
  guardianRelation: string
  guardianAddress: string
  documents: AdmissionDocument[]
  interviewType: string
  interviewDate: string
  interviewScore: string
  interviewResult: string
  decision: "Admit" | "Reject" | "Waitlist" | ""
  status: ApplicationStatus
  submittedOn: string
  notes: string
}

export type Payment = {
  ref: string
  studentId: string
  period: string
  type: string
  amount: number
  method: string
  status: PaymentStatus
  date: string
}

export type Expense = {
  id: string
  title: string
  category: string
  amount: number
  date: string
}

export type MarkRow = {
  studentId: string
  score: number | null
  blockedByFee?: boolean
  manualOverride?: boolean
  overrideReason?: string
  visibleToParent?: boolean
}

export type MarkSheet = {
  id: string
  examName: string
  classId: string
  subject: string
  status: SheetStatus
  max: number
  /** Fee period label aligned with parent/fee ledger (e.g. "September 2026"). */
  feePeriod?: string
  rows: MarkRow[]
}

export type AttendanceMark = {
  studentId: string
  classId: string
  date: string
  status: AttendanceStatus
}

export type Lesson = {
  id: string
  classId: string
  subject: string
  title: string
  chapter: string
  status: LessonStatus
  target: string
  progress: number
  date?: string
  periodIndex?: number
}

export type AbsenceStatus = "Absent" | "Covered" | "Cancelled" | "Unmanaged"

export type TeacherAbsence = {
  id: string
  teacherId: string
  teacherName: string
  classId: string
  date: string
  periodIndex: number
  status: AbsenceStatus
  coverTeacherId?: string
  coverTeacherName?: string
  notes: string
}

export type DailyTestResult = { studentId: string; score: number | null }

export type DailyTest = {
  id: string
  classId: string
  subject: string
  date: string
  periodIndex?: number
  title: string
  max: number
  results: DailyTestResult[]
}

export type MonthlyResultStatus = "InProgress" | "Passed" | "LowMarks" | "Failed"

export type MonthlyTest = {
  id: string
  classId: string
  subject: string
  month: string
  title: string
  max: number
  passPercent: number
  results: DailyTestResult[]
}

export type MonthlySummary = {
  id: string
  studentId: string
  classId: string
  subject: string
  month: string
  testsTaken: number
  passedCount: number
  failedCount: number
  averagePercent: number
  status: MonthlyResultStatus
}

export type SchoolUpdate = {
  id: string
  classId: string
  kind: UpdateKind
  subject: string
  text: string
  status: UpdateStatus
  due: string
  author: string
}

export type TimetableSlot = {
  id: string
  classId: string
  day: string
  time: string
  /** 1-based period index within the class period_count. */
  periodIndex: number
  subject: string
  teacher: string
  room: string
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  at: string
}

export type SyncLog = {
  id: string
  fileName: string
  imported: number
  skipped: number
  failed: number
  notes: string[]
  at: string
}

export type AcademicSession = {
  id: string
  name: string
  start: string
  end: string
  current: boolean
}

export type SchoolState = {
  sessions: AcademicSession[]
  classes: ClassSection[]
  subjects: Subject[]
  staff: Staff[]
  students: Student[]
  applications: Application[]
  payments: Payment[]
  expenses: Expense[]
  sheets: MarkSheet[]
  attendance: AttendanceMark[]
  lessons: Lesson[]
  updates: SchoolUpdate[]
  slots: TimetableSlot[]
  audits: AuditEvent[]
  syncLogs: SyncLog[]
  teacherAbsences: TeacherAbsence[]
  dailyTests: DailyTest[]
  monthlyTests: MonthlyTest[]
  monthlySummaries: MonthlySummary[]
}

/** Monthly test rules used by FE displays (mirror API defaults). */
export const MONTHLY_TEST_RULES = {
  PASS_PERCENT: 40,
  LOW_MARKS_CEILING_PERCENT: 55,
  FAIL_TEST_COUNT: 2,
  LOW_MARKS_PASS_COUNT: 3,
} as const

export const TODAY = "2026-09-23"
export const PARENT_CHILDREN = ["CLS-24118", "CLS-23014"]
export const TEACHER_ID = "st-hassan"
export const PAGE_SIZE = 8
