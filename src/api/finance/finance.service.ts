import { api } from "@/lib/api"

/** Finance (Step 8): mirrors the API's category keys (constants/finance.js). */
export const EXPENSE_CATEGORIES = [
  { key: "StaffSalary", label: "Staff Salary" },
  { key: "Utilities", label: "Utilities" },
  { key: "Supplies", label: "Supplies" },
  { key: "Maintenance", label: "Maintenance" },
  { key: "Other", label: "Other" },
] as const
export const INCOME_CATEGORIES = [
  { key: "Donation", label: "Donation" },
  { key: "Grant", label: "Grant" },
  { key: "Misc", label: "Misc Income" },
] as const
export const PAYMENT_METHODS = [
  { key: "Cash", label: "Cash" },
  { key: "BankTransfer", label: "Bank transfer" },
  { key: "Cheque", label: "Cheque" },
  { key: "Online", label: "Online" },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"]
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]["key"]
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["key"]
export type FinanceFormat = "pdf" | "xlsx" | "csv"

export type IncomeRow = {
  id: string
  source: "fee" | "other"
  entryId: number | null
  paymentId: number | null
  category: "FeeIncome" | IncomeCategory
  categoryLabel: string
  originalCategory?: string | null
  amount: number
  date: string
  description: string
  detail: string | null
  reference: string | null
  receiptNo: string | null
  paymentMethod: string | null
  receivedFrom?: string | null
  notes?: string | null
  recordedBy?: string | null
  locked: boolean
}
export type PeriodInfo = { key: string; kind: "month" | "quarter" | "fy"; label: string; from: string; to: string }
export type IncomeList = {
  period: PeriodInfo
  rows: IncomeRow[]
  totals: { total: number; fee: number; other: number; receipts: number; entries: number; byCategory: Record<string, number> }
}

export type ExpenseRow = {
  id: number
  category: ExpenseCategory
  categoryLabel: string
  originalCategory: string | null
  amount: number
  date: string
  description: string
  referenceNo: string | null
  paymentMethod: PaymentMethod | null
  notes: string | null
  recordedBy: string | null
  recordedById: number | null
}
export type ExpenseList = {
  month: string
  /** "own" for the accountant: only the entries they recorded and never a total. */
  scope: "school" | "own"
  rows: ExpenseRow[]
  totals?: { total: number; staff: number; other: number; entries: number; byCategory: Record<ExpenseCategory, number> }
}

export type IncomeInput = { category: IncomeCategory; amount: number; date: string; description: string; referenceNo?: string | null }
export type ExpenseInput = {
  category: ExpenseCategory
  amount: number
  date: string
  description: string
  referenceNo?: string | null
  paymentMethod?: PaymentMethod | null
}

export type BreakdownItem = { key: string; label: string; amount: number; percent: number }
export type FinanceReport = {
  period: PeriodInfo
  totals: {
    income: number
    feeIncome: number
    otherIncome: number
    expenses: number
    staffExpenses: number
    net: number
    position: "Surplus" | "Deficit" | "Break-even"
  }
  series: { month: string; label: string; income: number; feeIncome: number; otherIncome: number; expenses: number; net: number }[]
  breakdown: { income: BreakdownItem[]; expenses: BreakdownItem[] }
  reconciliation: { feeReceipts: number; feeIncome: number; otherIncomeEntries: number; expenseEntries: number; basis: string }
}

const financeService = {
  income: (period: string) => api.get<IncomeList>("/finance/income", { period }),
  addIncome: (input: IncomeInput) => api.post<IncomeRow>("/finance/income", input),
  updateIncome: (id: number, input: Partial<IncomeInput>) => api.patch<IncomeRow>(`/finance/income/${id}`, input),
  removeIncome: (id: number, reason: string) => api.delete<boolean>(`/finance/income/${id}`, { reason }),

  expenses: (month: string) => api.get<ExpenseList>("/expenses", { month }),
  addExpense: (input: ExpenseInput) => api.post<ExpenseRow>("/expenses", input),
  updateExpense: (id: number, input: Partial<ExpenseInput>) => api.patch<ExpenseRow>(`/expenses/${id}`, input),
  removeExpense: (id: number, reason: string) => api.delete<boolean>(`/expenses/${id}`, { reason }),

  report: (period: string) => api.get<FinanceReport>("/finance/report", { period }),
  downloadReport: (period: string, format: FinanceFormat) =>
    api.download("/finance/report/export", { period, format }, `financial-report-${period}.${format}`),
  /** Opens the receipt PDF in `target` (a tab opened on click); downloads it when no tab could open. */
  openReceipt: (paymentId: number, receiptNo: string | null, target?: Window | null) =>
    api.download(`/fees/payments/${paymentId}/receipt`, { format: "pdf" }, `receipt-${receiptNo ?? paymentId}.pdf`, false, target),
}

export default financeService
