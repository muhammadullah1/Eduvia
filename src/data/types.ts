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
  /** Monthly tuition used when fee months are generated. */
  monthlyFee: number
}

export type Subject = {
  id: string
  name: string
  code: string
}

/** One entry per subject a teacher has held; closed rows are never rewritten (UR-02 / BR-13). */
export type SubjectAssignment = {
  subject: string
  from: string
  to?: string
  by: string
  reason?: string
}

export type Staff = {
  id: string
  name: string
  /** "Teacher", "Accountant", "Operations Manager", "Super Admin". */
  role: string
  email: string
  phone: string
  /** The single active subject for teachers; empty for non-teaching staff. */
  subject: string
  subjectHistory: SubjectAssignment[]
  classIds: string[]
}

export type Student = {
  id: string
  admissionNo?: string
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

export type FeeMonthStatus = "Paid" | "Partially Paid" | "Unpaid" | "Advance"

/** One monthly fee record per student per month (UR-09 / §10). Status is derived from the amounts. */
export type FeeMonth = {
  id: string
  studentId: string
  /** YYYY-MM */
  month: string
  feeType: string
  amountDue: number
  amountPaid: number
  dueDate: string
}

export type FeeAllocation = { feeMonthId: string; month: string; amount: number }

export type Payment = {
  /** Receipt number generated when the payment is recorded. */
  ref: string
  studentId: string
  amount: number
  method: string
  status: PaymentStatus
  date: string
  /** Staff name and role that recorded it (accountants only ever see their own). */
  recordedBy: string
  recordedByRole: string
  allocations: FeeAllocation[]
  unallocated: number
  mode: "auto" | "manual"
  /** Duplicate protection: re-submitting the same key returns the original receipt. */
  idempotencyKey?: string
  note?: string
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
}

export type MarkSheet = {
  id: string
  /** Groups the subject sheets of one exam; fee overrides apply per exam + student. */
  examId: string
  examName: string
  classId: string
  subject: string
  status: SheetStatus
  max: number
  /** Fee month (YYYY-MM) checked by the result fee rule at parent view time. */
  feeMonth?: string
  rows: MarkRow[]
}

/** Audited manual release of a fee-withheld result (UR-07). Never alters the result itself. */
export type ResultOverride = {
  id: string
  examId: string
  studentId: string
  reason: string
  grantedBy: string
  grantedAt: string
  revokedAt?: string
  revokedBy?: string
}

export type AttendanceMark = {
  studentId: string
  classId: string
  date: string
  status: AttendanceStatus
}

/** Chapters planned by the operations manager per class + subject (UR-04). */
export type PlannedChapter = {
  id: string
  classId: string
  subject: string
  sequence: number
  title: string
  description?: string
  targetDate?: string
  createdBy: string
}

export type ReviewStatus = "Submitted" | "Approved" | "Rejected"

/** Teacher's daily lesson update; only Approved ones reach parents. */
export type DailyLesson = {
  id: string
  classId: string
  subject: string
  teacherId: string
  teacherName: string
  date: string
  chapterId: string
  classwork: string
  homework: string
  remarks: string
  reviewStatus: ReviewStatus
  reviewedBy?: string
  reviewNote?: string
}

export type AbsenceStatus = "Pending" | "Covered" | "Cancelled" | "NoClass"

/** A teacher marked absent for one period of one date (UR-03). */
export type TeacherAbsence = {
  id: string
  teacherId: string
  date: string
  periodIndex: number
  /** Class and subject the teacher would have taught; empty for a free period. */
  classId?: string
  subject?: string
  status: AbsenceStatus
  markedBy: string
  notes: string
}

export type Substitution = {
  id: string
  absenceId: string
  date: string
  periodIndex: number
  classId: string
  subject: string
  originalTeacherId: string
  substituteTeacherId: string
  authorizedBy: string
  at: string
}

/** One weekly test day per class + subject (UR-05). */
export type TestSchedule = {
  id: string
  classId: string
  subject: string
  weekday: string
  periodIndex: number
  max: number
  active: boolean
}

export type WeeklyTestStatus = "Scheduled" | "MarksEntered" | "Published"

export type WeeklyTest = {
  id: string
  scheduleId: string
  classId: string
  subject: string
  date: string
  /** YYYY-MM */
  month: string
  week: number
  max: number
  status: WeeklyTestStatus
  results: { studentId: string; score: number | null }[]
  enteredBy?: string
  publishedBy?: string
}

export type MonthlyOutcome = "InProgress" | "Passed" | "LowMarks" | "Failed"

export type DailyTestRules = {
  passPercent: number
  maxFailsPerMonth: number
  lowMarksEnabled: boolean
  lowMarksMinPassed: number
  lowMarksBelowPercent: number
}

export type ResultFeeRule = "all_due_paid" | "exam_month_paid" | "disabled"

/** Mirrors the API `school_settings` rows. */
export type SchoolSettings = {
  dailyTestRules: DailyTestRules
  resultVisibility: { feeRule: ResultFeeRule; requireOverrideReason: boolean }
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
  teacherId: string
  /** Display name of the teacher. */
  teacher: string
  room: string
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  at: string
  /** What the event touched, e.g. "fee_payment", "substitute_assignment" (mirrors `audit_logs.entity_type`). */
  entity?: string
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
  feeMonths: FeeMonth[]
  payments: Payment[]
  expenses: Expense[]
  sheets: MarkSheet[]
  resultOverrides: ResultOverride[]
  attendance: AttendanceMark[]
  plannedChapters: PlannedChapter[]
  dailyLessons: DailyLesson[]
  updates: SchoolUpdate[]
  slots: TimetableSlot[]
  audits: AuditEvent[]
  syncLogs: SyncLog[]
  teacherAbsences: TeacherAbsence[]
  substitutions: Substitution[]
  testSchedules: TestSchedule[]
  weeklyTests: WeeklyTest[]
  settings: SchoolSettings
}

export const DEFAULT_SETTINGS: SchoolSettings = {
  dailyTestRules: { passPercent: 40, maxFailsPerMonth: 1, lowMarksEnabled: true, lowMarksMinPassed: 3, lowMarksBelowPercent: 55 },
  resultVisibility: { feeRule: "all_due_paid", requireOverrideReason: true },
}

export const TODAY = "2026-09-23"
/** Children linked to the demo parent (Sara Ahmed). Parent screens never read outside this list. */
export const PARENT_CHILDREN = ["CLS-24118", "CLS-23014"]
export const TEACHER_ID = "st-hassan"
export const PAGE_SIZE = 8
