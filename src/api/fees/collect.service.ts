import { api } from "@/lib/api"

/** Collect Fee desk (Finance Step 5). Money totals are only present where the role may see them. */
export type CollectOverview = {
  date: string
  totalStudents: number
  withOutstanding: number
  /** Super Admin only: today's school-wide collection. */
  todayCollection?: { receipts: number; amount: number }
  /** Accountant only: their own receipts today. */
  myCollectionToday?: { receipts: number; amount: number }
}

export type CollectStudent = {
  id: number
  name: string
  admissionNo: string
  status: string
  class: { id: number; label: string | null } | null
  outstanding: number
  openBills: number
  creditBalance: number
}

export type OpenBill = {
  id: number
  month: string
  label: string
  feeType: string
  amountDue: number
  amountPaid: number
  balance: number
  status: string
  dueDate: string | null
}

export type CreditEntry = {
  id: number
  date: string
  type: "Credit" | "Applied" | "Reversal"
  source: string
  amount: number
  balanceAfter: number
  receiptNo: string | null
  paymentId: number | null
  feeMonth: { id: number; month: string; label: string; feeType: string } | null
  notes: string | null
}

export type CollectContext = {
  student: { id: number; name: string; admissionNo: string; status: string; class: { id: number; label: string } | null }
  openBills: OpenBill[]
  outstanding: number
  creditBalance: number
  creditHistory: CreditEntry[]
  recentReceipts: { id: number; receiptNo: string; paymentDate: string; amount: number; method: string }[]
}

export type ReceiptLine = { id: number; month: string; label: string; feeType: string; amount: number }

export type ServerReceipt = {
  id: number | null
  receiptNo: string | null
  paymentDate: string
  status: string
  method: string
  amount: number
  unallocatedAmount: number
  allocationMode: string
  feeMonths: ReceiptLine[]
  student: { id: number; name: string; admissionNo: string } | null
  recordedBy: { id: number; name: string } | null
  notes: string | null
  creditApplied: { feeMonthId: number; month: string; label: string; feeType: string; amount: number }[]
  creditAppliedTotal: number
  creditAdded: number
  creditBalance: number
}

export type PaymentMethod = "Cash" | "BankTransfer" | "Cheque" | "Online"

export type CollectInput = {
  studentId: number
  amount: number
  method: PaymentMethod
  paidOn: string
  notes?: string
  applyCredit: boolean
  idempotencyKey?: string
}

export const COLLECT_QUERY_KEY = "collect-fee"

const collectService = {
  overview: () => api.get<CollectOverview>("/fees/collect/overview"),
  search: (q: string) => api.get<CollectStudent[]>(`/fees/collect/students?q=${encodeURIComponent(q)}`),
  context: (studentId: number) => api.get<CollectContext>(`/fees/collect/students/${studentId}`),
  preview: (input: CollectInput) => api.post<{ preview: true; allocation: ServerReceipt }>("/fees/payments/preview", input),
  record: (input: CollectInput) => api.post<{ duplicate: boolean; receipt: ServerReceipt }>("/fees/payments", input),
}

export default collectService
