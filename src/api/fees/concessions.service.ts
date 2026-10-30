import { api } from "@/lib/api"

import type { FeeType } from "./fee-structure.service"

export type ConcessionMode = "fixed_discount" | "percent" | "waiver"
export type ConcessionStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "Revoked"
  | "Superseded"

export type ConcessionPolicy = {
  allowedModes: ConcessionMode[]
  approvalRule: "none" | "always" | "threshold"
  approvalPercentAbove: number | null
  approvalAmountAbove: number | null
}

export type ConcessionReason = {
  id: number
  schoolId: number
  label: string
  defaultMode: ConcessionMode | null
  defaultValue: number | null
  sortOrder: number
  active: boolean
}

export type FeeConcession = {
  id: number
  schoolId: number
  sessionId: number
  studentId: number
  reasonId: number | null
  reasonLabel: string | null
  replacesId: number | null
  feeType: FeeType
  feeTypes: FeeType[]
  mode: ConcessionMode
  value: number
  effectiveFrom: string
  effectiveTo: string | null
  status: ConcessionStatus
  notes: string | null
  rejectionReason?: string | null
  approvedAt: string | null
  studentName?: string | null
  admissionNo?: string | null
}

export type FeeBreakdown = {
  studentId: number
  month: string
  feeType: FeeType
  base: number | null
  discount: number
  net: number | null
  conflict: boolean
  snapshot: {
    conflict: boolean
    applied: Array<{
      id: number
      mode: string
      value?: number
      discount: number
      reasonLabel?: string | null
    }>
    feeType: string
    base: number | null
    reasonLabel?: string | null
    mode?: string | null
    value?: number | null
    net?: number
    discount?: number
  }
}

export type CreateConcessionInput = {
  studentId: number
  sessionId?: number
  reasonId?: number
  reasonLabel?: string
  mode: ConcessionMode
  value: number
  feeType?: FeeType
  effectiveFrom?: string
  effectiveTo?: string | null
  notes?: string | null
}

export const CONCESSIONS_QUERY_KEY = "fee-concessions"
export const CONCESSION_REASONS_QUERY_KEY = "concession-reasons"

const concessionsService = {
  list: (params?: { status?: ConcessionStatus; sessionId?: number; studentId?: number }) =>
    api.get<FeeConcession[]>("/fee-concessions", params),
  listForStudent: (studentId: number) =>
    api.get<FeeConcession[]>(`/fee-concessions/students/${studentId}`),
  get: (id: number) => api.get<FeeConcession>(`/fee-concessions/${id}`),
  create: (body: CreateConcessionInput) => api.post<FeeConcession>("/fee-concessions", body),
  approve: (id: number) => api.post<FeeConcession>(`/fee-concessions/${id}/approve`),
  reject: (id: number, reason: string) =>
    api.post<FeeConcession>(`/fee-concessions/${id}/reject`, { reason }),
  revoke: (id: number, reason: string) =>
    api.post<FeeConcession>(`/fee-concessions/${id}/revoke`, { reason }),
  breakdown: (studentId: number, month: string, feeType: FeeType = "Tuition") =>
    api.get<FeeBreakdown>(`/fee-concessions/students/${studentId}/breakdown`, { month, feeType }),
  siblingSuggestion: (studentId: number) =>
    api.get<{
      suggestSibling: boolean
      siblingStudentIds: number[]
      siblings: Array<{ id: number; name: string; admissionNo: string | null }>
    }>(`/fee-concessions/students/${studentId}/siblings`),
  listReasons: (includeInactive = false) =>
    api.get<ConcessionReason[]>("/concession-reasons", {
      includeInactive: includeInactive ? "1" : undefined,
    }),
  createReason: (body: {
    label: string
    defaultMode?: ConcessionMode | null
    defaultValue?: number | null
    sortOrder?: number
  }) => api.post<ConcessionReason>("/concession-reasons", body),
  updateReason: (
    id: number,
    body: Partial<{
      label: string
      defaultMode: ConcessionMode | null
      defaultValue: number | null
      sortOrder: number
      active: boolean
    }>
  ) => api.patch<ConcessionReason>(`/concession-reasons/${id}`, body),
  removeReason: (id: number) => api.delete<{ id: number; archived: boolean }>(`/concession-reasons/${id}`),
}

export default concessionsService
