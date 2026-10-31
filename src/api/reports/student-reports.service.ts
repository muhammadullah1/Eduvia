import type { FeeReport, FeeReportFormat } from "@/api/fees/fee-reports.service"
import { api } from "@/lib/api"

export type StudentReportKind = "students" | "admissions" | "class-distribution" | "status-changes" | "promotions"
export type StudentReport = FeeReport
export type StudentReportFilters = { from?: string; to?: string; classId?: string; status?: string }

/** Which filters a report takes; the API ignores the rest. */
export type StudentReportMeta = { kind: StudentReportKind; label: string; detail: string; range: boolean; classFilter: boolean; statusFilter: boolean }

export const STUDENT_LIST_REPORT: StudentReportMeta = { kind: "students", label: "Student list", detail: "Every student with class, guardian, contact and status", range: false, classFilter: true, statusFilter: true }

export const STUDENT_REPORT_KINDS: StudentReportMeta[] = [
  STUDENT_LIST_REPORT,
  { kind: "admissions", label: "Admission trend", detail: "New admissions per month in the period", range: true, classFilter: true, statusFilter: false },
  { kind: "class-distribution", label: "Class distribution", detail: "Active students and seat fill per class in the current session", range: false, classFilter: false, statusFilter: false },
  { kind: "status-changes", label: "Status records", detail: "Every student status change recorded in the period", range: true, classFilter: true, statusFilter: false },
  { kind: "promotions", label: "Promotions", detail: "Promotion outcomes recorded in the period", range: true, classFilter: true, statusFilter: false },
]

export const STUDENT_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Pending", label: "Pending" },
  { value: "Inactive", label: "Inactive" },
  { value: "Graduated", label: "Graduated" },
  { value: "StruckOff", label: "Struck off" },
  { value: "Withdrawn", label: "Withdrawn" },
] as const

const ALL = "all"

function query(filters: StudentReportFilters, format: string) {
  const params: Record<string, string> = { format }
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.classId && filters.classId !== ALL) params.classId = filters.classId
  if (filters.status && filters.status !== ALL) params.status = filters.status
  return params
}

const studentReportsService = {
  get: (kind: StudentReportKind, filters: StudentReportFilters) =>
    api.get<StudentReport>(`/reports/students/${kind}`, query(filters, "json")),
  download: (kind: StudentReportKind, filters: StudentReportFilters, format: FeeReportFormat) =>
    api.download(`/reports/students/${kind}`, query(filters, format), `student-report.${format}`),
}

export default studentReportsService
