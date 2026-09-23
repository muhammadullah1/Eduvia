export type StudentStatus = "Active" | "Pending" | "Withdrawn"
export type ApplicationStatus = "New" | "Review" | "Enrolled" | "Rejected"
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

export type Application = {
  id: string
  name: string
  classId: string
  guardian: string
  phone: string
  dob: string
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

export type MarkRow = { studentId: string; score: number | null }

export type MarkSheet = {
  id: string
  examName: string
  classId: string
  subject: string
  status: SheetStatus
  max: number
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
  status: LessonStatus
  target: string
  progress: number
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
}

export const TODAY = "2026-09-23"
export const PARENT_CHILDREN = ["CLS-24118", "CLS-23014"]
export const TEACHER_ID = "st-hassan"
export const PAGE_SIZE = 8
