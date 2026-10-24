import { api } from "@/lib/api"

export type PromotionAction = "promote" | "hold" | "graduate"

export type BulkPromoteRequest = {
  fromClassId: number
  toClassId?: number | null
  holdClassId?: number | null
  sessionId: number
  date: string
  graduationResult?: string
  /** Graduate from a class that is not the final grade (audited). */
  graduationOverride?: boolean
  students: { studentId: number; action: PromotionAction }[]
}

export type BulkPromoteResult = {
  promoted: number
  repeated: number
  graduated: number
  fromClass: { id: number; label: string }
  toClass: { id: number; label: string } | null
  repeatClass: { id: number; label: string } | null
  session: { id: number; name: string }
}

export type EnrollmentEventType = "Promotion" | "Repeat" | "Graduation" | "New Admission"

export type EnrollmentEvent = {
  id: string
  date: string
  type: EnrollmentEventType
  student: { id: number; name: string; admissionNo: string } | null
  fromClass: string | null
  toClass: string | null
  session: string | null
  recordedBy: string | null
}

export type EnrollmentHistoryResponse = {
  events: EnrollmentEvent[]
  pagination: { total: number; page: number; pageSize: number; totalPages: number }
}

export const PROMOTION_HISTORY_QUERY_KEY = "promotion-history"

const promotionsService = {
  bulkPromote: (body: BulkPromoteRequest) =>
    api.post<BulkPromoteResult>("/students/promotions/bulk", body),

  history: (params: { page?: number; pageSize?: number; type?: EnrollmentEventType }) =>
    api.get<EnrollmentHistoryResponse>("/students/promotions/history", params),
}

export default promotionsService
