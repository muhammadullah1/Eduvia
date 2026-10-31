import { api } from "@/lib/api"

export const FEE_TYPES = ["Tuition", "Admission", "Exam", "Annual", "Promotion"] as const
export type FeeType = (typeof FEE_TYPES)[number]
export type FeeFrequency = "Monthly" | "OneTime" | "Yearly"

export const FEE_TYPE_FREQUENCY: Record<FeeType, FeeFrequency> = {
  Tuition: "Monthly",
  Admission: "OneTime",
  Exam: "Yearly",
  Annual: "Yearly",
  Promotion: "OneTime",
}

export type FeeStructureFee = {
  id: number
  feeType: FeeType
  frequency: FeeFrequency
  amount: number
  effectiveFrom: string
}

export type FeeStructure = {
  class: { id: number; label: string; sessionId: number; sessionName: string | null }
  asOf: string
  sessionStartDate?: string
  sessionLocked?: boolean
  editable?: boolean
  bootstrapEligible?: FeeType[]
  fees: FeeStructureFee[]
  upcoming: FeeStructureFee[]
  monthlyTotal: number
  otherTotal: number
}

export type FeeHistoryStatus = "Current" | "Past" | "Scheduled" | "Removed"

export type FeeHistoryEntry = FeeStructureFee & {
  status: FeeHistoryStatus
  addedAt: string
  addedBy: string | null
  removedAt: string | null
  removedBy: string | null
  removedReason: string | null
}

export type FeeHistory = { feeType: FeeType; entries: FeeHistoryEntry[] }

export type AddFeeInput = { feeType: FeeType; amount: number; effectiveFrom?: string }

export const FEE_STRUCTURE_QUERY_KEY = "fee-structure"

const base = (classId: number) => `/fee-structures/classes/${classId}`

const feeStructureService = {
  get: (classId: number) => api.get<FeeStructure>(base(classId)),
  history: (classId: number, feeType: FeeType) =>
    api.get<FeeHistory>(`${base(classId)}/history/${feeType}`),
  add: (classId: number, input: AddFeeInput) => api.post<unknown>(base(classId), input),
  remove: (classId: number, feeType: FeeType, reason: string) =>
    api.delete<unknown>(`${base(classId)}/${feeType}`, { reason }),
}

export default feeStructureService
