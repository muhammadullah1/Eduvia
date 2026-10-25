import { api } from "@/lib/api"

export type FeeReportKind =
  | "daily"
  | "monthly"
  | "class-wise"
  | "student-wise"
  | "outstanding"
  | "advance"
  | "defaulters"
export type FeeReportFormat = "csv" | "xlsx" | "pdf"

export type FeeReportColumn = { key: string; label: string; type?: "money" | "number" | "percent" | "text" }
export type FeeReport = {
  title: string
  filename: string
  meta: [string, string | number][]
  columns: FeeReportColumn[]
  rows: Record<string, string | number | null>[]
  /** Null for the accountant: no totals, counts or summaries (client addendum). */
  summary: [string, string | number][] | null
}

export type FeeReportFilters = { from?: string; to?: string; month?: string; classId?: string }

export const FEE_REPORT_KINDS: { kind: FeeReportKind; label: string; detail: string; range: "days" | "month" }[] = [
  { kind: "daily", label: "Daily collection", detail: "Every receipt in a date range", range: "days" },
  { kind: "monthly", label: "Monthly summary", detail: "Day-by-day collections by payment method", range: "month" },
  { kind: "class-wise", label: "Class-wise", detail: "Enrolled and paid students, collected, outstanding and collection % per class", range: "month" },
  { kind: "student-wise", label: "Student-wise", detail: "Each student's months, dues, payments and credit up to the month", range: "month" },
  { kind: "outstanding", label: "Outstanding", detail: "Students with dues up to the month", range: "month" },
  { kind: "advance", label: "Advance & credit", detail: "Credit-ledger balances and months already paid ahead", range: "month" },
  { kind: "defaulters", label: "Defaulters", detail: "Students with months past their due date and not fully paid", range: "month" },
]

/** The Figma sub-tabs: Outstanding and Advance share one tab. */
export const FEE_REPORT_TABS: { value: string; label: string; kinds: FeeReportKind[] }[] = [
  { value: "daily", label: "Daily Collection", kinds: ["daily"] },
  { value: "monthly", label: "Monthly Summary", kinds: ["monthly"] },
  { value: "class-wise", label: "Class-wise", kinds: ["class-wise"] },
  { value: "student-wise", label: "Student-wise", kinds: ["student-wise"] },
  { value: "outstanding-advance", label: "Outstanding / Advance", kinds: ["outstanding", "advance"] },
  { value: "defaulters", label: "Defaulters", kinds: ["defaulters"] },
]

const query = (filters: FeeReportFilters, format?: string) => ({
  from: filters.from,
  to: filters.to,
  month: filters.month,
  classId: filters.classId && filters.classId !== "all" ? filters.classId : undefined,
  format,
})

const feeReportsService = {
  get: (kind: FeeReportKind, filters: FeeReportFilters) =>
    api.get<FeeReport>(`/fees/reports/${kind}`, query(filters, "json")),
  download: (kind: FeeReportKind, filters: FeeReportFilters, format: FeeReportFormat) =>
    api.download(`/fees/reports/${kind}`, query(filters, format), `fee-report.${format}`),
}

export default feeReportsService
