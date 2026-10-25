import { api } from "@/lib/api"

/** Statuses a student moves through (SRS 4.3.3, p14–16). */
export type LifecycleStatus = "Pending" | "Active" | "Inactive" | "Graduated" | "StruckOff" | "Withdrawn"

/** Rows in student_status_events, plus promotions, as returned by the history endpoints. */
export type LifecycleEventType =
  | "Promoted"
  | "Repeated"
  | "Enrolled"
  | "Deactivated"
  | "Reactivated"
  | "Graduated"
  | "StruckOff"
  | "Withdrawn"
  | "Readmitted"

export type LifecycleEvent = {
  id: string
  date: string
  type: LifecycleEventType
  student: { id: number; name: string; admissionNo: string } | null
  fromClass: string | null
  toClass: string | null
  session: string | null
  fromStatus: string | null
  toStatus: string | null
  reason: string | null
  reasonCategory: string | null
  finalResult: string | null
  academicStatus: string | null
  /** Fee roles only; stripped by the API for the Operations Manager. */
  outstandingAmount?: number | null
  /** Yes/no dues recorded with a strike-off (every staff role). */
  hasOutstanding?: boolean | null
  transferToSchool: string | null
  graduationOverride: boolean | null
  recordedBy: string | null
}

export type Pagination = { total: number; page: number; pageSize: number; totalPages: number }

export type LifecycleHistoryParams = {
  page?: number
  pageSize?: number
  type?: LifecycleEventType
  from?: string
  to?: string
  classId?: number
  sessionId?: number
  studentId?: number
  reasonCategory?: string
  q?: string
}

export type LifecycleHistoryResponse = { events: LifecycleEvent[]; pagination: Pagination }

export type StudentLifecycle = {
  studentId: number
  status: LifecycleStatus
  admittedOn: string | null
  finalGrade: boolean
  /** Amount for fee roles; null for the Operations Manager. */
  outstanding: number | null
  hasOutstanding: boolean
  allowed: { to: LifecycleStatus; eventType: LifecycleEventType }[]
  reasons: { Inactive: string[]; StruckOff: string[] }
  events: LifecycleEvent[]
}

export type ChangeStatusBody = {
  status: LifecycleStatus
  reason: string
  effectiveOn: string
  reasonCategory?: string | null
  finalResult?: string | null
  graduationOverride?: boolean
  academicStatus?: string | null
  transferToSchool?: string | null
  classId?: number | null
  sessionId?: number | null
}

export type PromoteBody = { classId: number; sessionId?: number; date: string }

export const LIFECYCLE_QUERY_KEY = "student-lifecycle"
export const LIFECYCLE_HISTORY_QUERY_KEY = "lifecycle-history"

const lifecycleService = {
  history: (params: LifecycleHistoryParams) =>
    api.get<LifecycleHistoryResponse>("/students/lifecycle/history", params),

  timeline: (studentId: number) => api.get<StudentLifecycle>(`/students/${studentId}/lifecycle`),

  changeStatus: (studentId: number, body: ChangeStatusBody) =>
    api.post<unknown>(`/students/${studentId}/status`, body),

  promote: (studentId: number, body: PromoteBody) => api.post<unknown>(`/students/${studentId}/promote`, body),
}

export default lifecycleService
