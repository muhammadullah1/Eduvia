import { api } from "@/lib/api"

export type FeeAdjustment = {
  id: number
  feeMonthId: number
  studentId: number
  deltaCollectible: number
  reason: string
  status: string
  approvedAt: string | null
  createdAt: string
}

export type AdjustmentResult = {
  adjustment: FeeAdjustment
  feeMonth: {
    id: number
    netAmount: number
    adjustmentTotal: number
    collectibleAmount: number
    paidAmount: number
    status: string
  }
}

const adjustmentsService = {
  request: (feeMonthId: number, body: { deltaCollectible: number; reason: string }) =>
    api.post<FeeAdjustment>(`/fees/months/${feeMonthId}/adjustments`, body),
  approve: (id: number) => api.post<AdjustmentResult>(`/fees/adjustments/${id}/approve`),
  reject: (id: number, reason: string) =>
    api.post<FeeAdjustment>(`/fees/adjustments/${id}/reject`, { reason }),
}

export default adjustmentsService
