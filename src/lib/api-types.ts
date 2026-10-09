import type {
  AbsenceStatus,
  AttendanceStatus,
  DailyTestRules,
  DocumentStatus,
  PaymentStatus,
  ResultFeeRule,
  ReviewStatus,
  SheetStatus,
  StudentStatus,
  UpdateKind,
  UpdateStatus,
  WeeklyTestStatus,
} from "@/data/types"

export type ApiClass = {
  id: number
  label: string
  grade: string
  section: string
  room?: string | null
  periodCount?: number
  monthlyFee?: string | number
}

export type ApiSession = {
  id: number
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export type ApiSubject = {
  id: number
  name: string
  code: string
}

export type ApiTeacher = {
  id: number
  employeeCode: string
  fkUserId: number
  fkSubjectId: number
  user?: {
    id: number
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    status: string
  } | null
  subject?: {
    id: number
    name: string
    code: string
  } | null
  classes?: Array<{
    id: number
    label: string
    grade: string
    section: string
  }>
}

export type ApiUser = {
  id: number
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  role: string
  status: string
}

export type ApiStudent = {
  id: number
  fkClassId: number
  admissionNo: string
  firstName: string
  lastName: string
  gender?: string | null
  dob?: string | null
  status: StudentStatus
  admittedOn?: string | null
  class?: {
    id: number
    label: string
    grade: string
    section: string
  } | null
}

export type ApiApplication = {
  id: number
  name: string
  fkClassId?: number | null
  guardian: string
  phone: string
  dob?: string | null
  gender?: string | null
  address?: string | null
  previousSchool?: string | null
  previousClass?: string | null
  guardianRelation?: string | null
  guardianAddress?: string | null
  interviewType?: string | null
  interviewDate?: string | null
  interviewScore?: string | null
  interviewResult?: string | null
  decision?: "Admit" | "Reject" | "Waitlist" | "" | null
  status:
    | "New"
    | "Review"
    | "Waitlist"
    | "Enrolled"
    | "Rejected"
    | "Inquiry"
    | "Applied"
    | "UnderReview"
    | "InterviewScheduled"
    | "Approved"
  submittedOn?: string | null
  notes?: string | null
  documents?: Array<{
    id: number
    label: string
    status: DocumentStatus
  }>
}

export type ApiFeeMonth = {
  id: number
  month: string
  label?: string
  feeType?: string
  amountDue: number | string
  amountPaid: number | string
  balance?: number | string
  status?: string
  dueDate?: string
  studentId: string | number
}

export type ApiPayment = {
  id: number
  receiptNo: string
  paymentDate: string
  status: PaymentStatus
  method: string
  feeType?: string
  amount: number | string
  unallocatedAmount?: number | string
  allocationMode?: "auto" | "manual"
  feeMonths?: Array<{
    id?: number
    month: string
    label?: string
    amount: number | string
  }>
  student?: {
    id: number
    name: string
    admissionNo: string
  } | null
  recordedBy?: {
    id: number
    name: string
  } | null
  notes?: string | null
  idempotencyKey?: string | null
}

export type ApiExpense = {
  id: number
  title: string
  category: string
  amount: number | string
  date: string
}

export type ApiExam = {
  id: number
  name: string
  feeMonth?: string | null
  fkClassId: number
  sheets?: Array<{
    id: number
    subject: {
      id: number
      name: string
    }
    status: SheetStatus | "Approved"
    maxScore: string | number
    publishedAt?: string | null
    rows?: Array<{
      fkStudentId: number
      score: number | null
    }>
  }>
}

export type ApiOverride = {
  id: number
  fkExamId: number
  fkStudentId: number
  reason: string
  grantedAt: string
  revokedAt?: string | null
  grantedBy?: {
    id: number
    firstName: string
    lastName: string
  } | null
  student?: {
    id: number
    firstName: string
    lastName: string
    admissionNo: string
  } | null
  exam?: {
    id: number
    name: string
  } | null
}

export type ApiAttendance = {
  id: number
  fkStudentId: number
  fkClassId: number
  date: string
  status: AttendanceStatus
}

export type ApiPlannedChapter = {
  id: number
  fkClassId: number
  fkSubjectId: number
  sequence: number
  title: string
  description?: string | null
  targetDate?: string | null
  subject?: {
    id?: number
    name: string
  } | null
}

export type ApiDailyLesson = {
  id: number
  fkClassId: number
  fkSubjectId: number
  fkTeacherId: number
  fkPlannedChapterId: number
  date: string
  classwork?: string | null
  homework?: string | null
  remarks?: string | null
  reviewStatus?: ReviewStatus
  reviewNote?: string | null
  subject?: {
    id?: number
    name: string
  } | null
  teacher?: {
    id: number
    user?: {
      firstName: string
      lastName: string
      email?: string
    } | null
  } | null
}

export type ApiTimetableSlot = {
  id: number
  fkClassId: number
  day: string
  time: string
  periodIndex: number
  subject: {
    id: number
    name: string
  }
  teacher: {
    id: number
    user?: {
      firstName: string
      lastName: string
      email?: string
    } | null
  }
  fkTeacherId: number
  room?: string | null
}

export type ApiAbsence = {
  id: number
  fkTeacherId: number
  fkClassId?: number | null
  fkSubjectId?: number | null
  date: string
  periodIndex: number
  status: AbsenceStatus
  notes?: string | null
  teacher?: {
    user?: {
      firstName: string
      lastName: string
      email?: string
    } | null
  } | null
  class?: {
    label: string
  } | null
  subject?: {
    name: string
  } | null
  substitution?: {
    id: number
    fkSubstituteTeacherId: number
    authorizedBy?: string | null
    createdAt?: string | null
    substituteTeacher?: {
      user?: {
        firstName: string
        lastName: string
        email?: string
      } | null
    } | null
  } | null
}

export type ApiSchedule = {
  id: number
  fkClassId: number
  fkSubjectId: number
  weekday: string
  periodIndex: number
  maxScore: number | string
  isActive: boolean
  subject?: {
    name: string
  } | null
}

export type ApiDailyTest = {
  id: number
  fkScheduleId?: number | null
  fkClassId: number
  fkSubjectId: number
  date: string
  month: string
  weekOfMonth: number
  maxScore: number | string
  status: WeeklyTestStatus
  subject?: {
    name: string
  } | null
  results?: Array<{
    fkStudentId: number
    score: number | null
  }>
  enteredBy?: {
    name: string
  } | null
  publishedBy?: {
    name: string
  } | null
}

export type ApiSettings = {
  dailyTestRules?: DailyTestRules
  resultVisibility?: {
    feeRule: ResultFeeRule
    requireOverrideReason: boolean
  }
  fees?: Record<string, unknown>
}

export type ApiUpdate = {
  id: number
  fkClassId: number
  kind: UpdateKind
  subject?: string | null
  text: string
  status: UpdateStatus
  dueDate?: string | null
  author?: string | null
}

export type ApiAuditLog = {
  id: number
  actorUserId?: number | null
  actorLabel?: string | null
  action: string
  at?: string | null
  created_at?: string | null
  entityType?: string | null
  entityId?: number | null
}
