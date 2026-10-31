import { api } from "@/lib/api"
import type { ApiFeeMonth } from "@/lib/api-types"

export type { ApiFeeMonth }

export type FeePaymentMonth = {
  id: number
  month: string
  label: string
  feeType: string
  amount: number
}

export type FeePaymentDto = {
  id: number
  receiptNo: string
  paymentDate: string
  status: string
  method: string
  amount: number
  unallocatedAmount?: number
  allocationMode?: string
  feeMonths: FeePaymentMonth[]
  student: { id: number; name: string; admissionNo: string } | null
  recordedBy: { id: number; name: string } | null
  notes: string | null
}

export type FeeSummaryDto = {
  month: string
  collectedThisMonth: number
  outstandingToDate: number
  statusCounts?: Record<string, number>
}

export type StudentLedgerBill = {
  id: number
  feeType: string
  due: number
  paid: number
  outstanding: number
  status: string
  dueDate: string | null
}

export type StudentLedgerMonth = {
  month: string
  label: string
  due: number
  paid: number
  outstanding: number
  status: string
  bills: StudentLedgerBill[]
}

export type StudentLedgerDto = {
  student: {
    id: number
    name: string
    admissionNo: string
    status?: string
    class?: { id: number; label: string } | null
  }
  months: StudentLedgerMonth[]
  summary?: {
    totalDue: number
    totalPaid: number
    outstanding: number
    creditBalance: number
    netBalance: number
    openMonths: number
  }
}

const feesService = {
  listMonths: (query?: { studentId?: number; month?: string }) =>
    api.get<ApiFeeMonth[]>("/fees/months", query),

  listPayments: (query?: { studentId?: number; date?: string; status?: string }) =>
    api.get<FeePaymentDto[]>("/fees/payments", query),

  confirmPayment: (id: number) =>
    api.post<FeePaymentDto>(`/fees/payments/${id}/confirm`, {}),

  summary: (query?: { month?: string }) =>
    api.get<FeeSummaryDto>("/fees/summary", query),

  studentLedger: (studentId: number) =>
    api.get<StudentLedgerDto>(`/fees/students/${studentId}/ledger`),
}

export default feesService
