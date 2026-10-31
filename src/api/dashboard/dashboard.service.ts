import type { PeriodInfo } from "@/api/finance/finance.service"
import { api } from "@/lib/api"

/**
 * Staff dashboard (GET /dashboard). The API builds only the widgets the caller's
 * permissions allow, so every widget is optional and absent ones are never shown.
 */
export type AttendanceToday = { marked: number; present: number; absent: number; leave: number; percent: number | null }
export type AttendanceWidget = { today: AttendanceToday; trend: { date: string; percent: number | null; absent: number }[] }
export type AbsentTeacher = { teacherId: number; name: string; periods: number; covered: number; uncovered: number }
export type PendingWidget = Partial<Record<"lessonReviews" | "marksToVerify" | "resultsToPublish" | "concessions" | "adjustments", number>>
export type FeeStatusWidget = { month: string; label: string; cleared: number; notCleared: number }
export type RecentPayment = { id: number; receiptNo: string | null; date: string; method: string; amount: number; studentName: string; classLabel: string | null }
export type FinanceWidget = {
  collected: number
  expected: number
  paidAgainstBills: number
  collectionRate: number
  outstanding: number
  trend: { month: string; label: string; amount: number }[]
  byMethod: { method: string; amount: number; receipts: number }[]
  defaulterClasses: { classId: number; label: string; students: number; amount: number }[]
  defaulterStudents: { studentId: number; name: string; classLabel: string | null; months: number; amount: number }[]
  advanceCredit: { students: number; amount: number }
  recentPayments: RecentPayment[]
}
export type IncomeVsExpensesWidget = { income: number; expenses: number; net: number }
export type AlertsWidget = { classesWithoutFeeStructure: { classId: number; label: string }[]; failedImports: number }
export type ReceiptRow = { id: number; receiptNo: string | null; studentName: string; admissionNo: string; paymentDate: string; feeMonths: string[]; amount: number; method: string }
export type GenerationWidget = { month: string; label: string; activeStudents: number; billed: number; notBilled: number }
export type ImportBatchRow = { id: number; fileName: string; status: string; totalRows: number; importedRows: number; errorRows: number; duplicateRows: number; uploadedAt: string }

export type DashboardWidgets = {
  students?: { active: number }
  teachers?: { active: number }
  attendance?: AttendanceWidget
  absentTeachers?: AbsentTeacher[]
  pending?: PendingWidget
  feeStatus?: FeeStatusWidget
  finance?: FinanceWidget
  incomeVsExpenses?: IncomeVsExpensesWidget
  alerts?: AlertsWidget
  myReceiptsToday?: { date: string; rows: ReceiptRow[] }
  generation?: GenerationWidget
  myImports?: ImportBatchRow[]
}
export type Dashboard = { period: PeriodInfo; today: string; widgets: DashboardWidgets; generatedAt: string }

const dashboardService = {
  get: (period: string) => api.get<Dashboard>("/dashboard", { period }),
}

export default dashboardService
