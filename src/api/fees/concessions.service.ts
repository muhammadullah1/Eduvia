import { api } from "@/lib/api"

import type { FeeType } from "./fee-structure.service"

export type ConcessionMode = "fixed_payable" | "fixed_discount" | "percent" | "waiver"
export type ConcessionCategory = "Standard" | "Scholarship" | "Sibling" | "Other"
export type ConcessionStatus = "Draft" | "PendingApproval" | "Approved" | "Rejected" | "Revoked"

export type FeeConcession = {
  id: number
  schoolId: number
  sessionId: number
  studentId: number
  familyId: number | null
  category: ConcessionCategory
  mode: ConcessionMode
  value: number
  priority: number
  stackable: boolean
  maxDiscountAmount: number | null
  effectiveFrom: string
  effectiveTo: string | null
  status: ConcessionStatus
  reason: string | null
  notes: string | null
  feeTypes: FeeType[]
  approvedAt: string | null
  studentName?: string | null
  admissionNo?: string | null
}

export type FeeBreakdown = {
  studentId: number
  month: string
  feeType: FeeType
  base: number
  discount: number
  net: number
  conflict: boolean
  snapshot: {
    conflict: boolean
    eligibilityBlocked?: boolean
    applied: Array<{ id: number; mode: string; discount: number; category?: string }>
    conflictIds?: number[]
    feeType: string
    base: number
  }
}

export type CreateConcessionInput = {
  studentId: number
  sessionId: number
  familyId?: number | null
  category?: ConcessionCategory
  mode: ConcessionMode
  value: number
  priority?: number
  stackable?: boolean
  maxDiscountAmount?: number | null
  effectiveFrom: string
  effectiveTo?: string | null
  feeTypes: FeeType[]
  reason?: string
  notes?: string
}

export const CONCESSIONS_QUERY_KEY = "fee-concessions"

const concessionsService = {
  list: (params?: { status?: ConcessionStatus; sessionId?: number; studentId?: number }) =>
    api.get<FeeConcession[]>("/fee-concessions", params),
  listForStudent: (studentId: number) =>
    api.get<FeeConcession[]>(`/fee-concessions/students/${studentId}`),
  get: (id: number) => api.get<FeeConcession>(`/fee-concessions/${id}`),
  create: (body: CreateConcessionInput) => api.post<FeeConcession>("/fee-concessions", body),
  submit: (id: number) => api.post<FeeConcession>(`/fee-concessions/${id}/submit`),
  approve: (id: number) => api.post<FeeConcession>(`/fee-concessions/${id}/approve`),
  reject: (id: number, reason: string) =>
    api.post<FeeConcession>(`/fee-concessions/${id}/reject`, { reason }),
  revoke: (id: number, reason: string) =>
    api.post<FeeConcession>(`/fee-concessions/${id}/revoke`, { reason }),
  breakdown: (studentId: number, month: string, feeType: FeeType = "Tuition") =>
    api.get<FeeBreakdown>(`/fee-concessions/students/${studentId}/breakdown`, { month, feeType }),
}

export default concessionsService
