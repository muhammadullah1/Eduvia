import { api } from "@/lib/api"

export type FeeReportKind = "daily" | "monthly" | "class-wise" | "student-wise" | "outstanding" | "advance"
export type FeeReportFormat = "csv" | "xlsx" | "pdf"

export type FeeReportColumn = { key: string; label: string; type?: "money" | "number" | "text" }
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
  { kind: "daily", label: "Daily collections", detail: "Every receipt in a date range", range: "days" },
  { kind: "monthly", label: "Monthly collections", detail: "Day-by-day totals by payment method", range: "month" },
  { kind: "class-wise", label: "Class-wise", detail: "Billed, collected and balance per class", range: "month" },
  { kind: "student-wise", label: "Student-wise", detail: "Each student's month and to-date position", range: "month" },
  { kind: "outstanding", label: "Outstanding fees", detail: "Students with dues up to the month", range: "month" },
  { kind: "advance", label: "Advance payments", detail: "Prepaid months and unallocated credit", range: "month" },
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
  importTemplate: () => api.download("/fees/import-template", undefined, "fee-import-template.xlsx"),
}

export default feeReportsService
