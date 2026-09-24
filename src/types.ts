export type Role = "management" | "teacher" | "parent"

export type StudentStatus = "Active" | "Pending" | "Inactive"
export type AdmissionStatus =
  "New" | "Review" | "Approved" | "Enrolled" | "Rejected"
export type AttendanceStatus = "Present" | "Absent" | "Leave"
export type UpdateType = "Homework" | "Classwork" | "Notice"
export type UpdateStatus = "Draft" | "Pending" | "Published"
export type SheetStatus = "Draft" | "Submitted" | "Verified" | "Published"

export type Student = {
  id: string
  name: string
  className: string
  rollNo: string
  guardian: string
  parentName: string | null
  status: StudentStatus
}

export type Admission = {
  id: string
  name: string
  dob: string
  applyingFor: string
  guardian: string
  notes: string
  status: AdmissionStatus
  appliedOn: string
}

export type Receipt = {
  id: string
  studentId: string
  studentName: string
  period: string
  type: string
  amount: number
  method: string
  paidOn: string
  source: "desk" | "sync"
}

export type FeeCharge = {
  id: string
  studentId: string
  period: string
  type: string
  amount: number
  due: string
}

export type AttendanceMark = {
  studentId: string
  className: string
  date: string
  status: AttendanceStatus
}

export type Lesson = {
  id: string
  className: string
  subject: string
  title: string
  targetDate: string
  progress: number
}

export type SchoolUpdate = {
  id: string
  type: UpdateType
  className: string
  subject: string
  text: string
  due: string
  status: UpdateStatus
  author: string
}

export type MarkEntry = {
  studentId: string
  score: number | null
}

export type MarkSheet = {
  id: string
  exam: string
  grade: string
  className: string
  subject: string
  maxMarks: number
  status: SheetStatus
  teacher: string
  entries: MarkEntry[]
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  at: string
}

export type SchoolState = {
  students: Student[]
  admissions: Admission[]
  receipts: Receipt[]
  charges: FeeCharge[]
  attendance: AttendanceMark[]
  lessons: Lesson[]
  updates: SchoolUpdate[]
  markSheets: MarkSheet[]
  audit: AuditEvent[]
  counters: {
    admission: number
    student: number
    update: number
    audit: number
  }
}

export type ActionResult =
  { ok: true; message: string } | { ok: false; error: string }

export type AdmissionInput = {
  name: string
  dob: string
  applyingFor: string
  guardian: string
  notes: string
}

export type PaymentInput = {
  studentId: string
  period: string
  feeType: string
  amount: number
  method: string
  reference: string
}

export type SyncRow = {
  reference: string
  studentId: string
  period: string
  feeType: string
  amount: number
}

export type SyncVerdict = {
  row: SyncRow
  outcome: "ready" | "skipped" | "failed"
  reason: string
}

export type AttendanceInput = {
  className: string
  date: string
  marks: { studentId: string; status: AttendanceStatus }[]
}

export type UpdateInput = {
  type: UpdateType
  className: string
  subject: string
  text: string
  due: string
}
