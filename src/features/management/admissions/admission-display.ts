import type { Application } from "@/data/types"

export type AdmissionUiStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "test_interview"
  | "admitted"
  | "rejected"
  | "waitlisted"
  | "withdrawn"

export type AdmissionStatusFilter = "all" | AdmissionUiStatus

export const ADMISSION_STATUS_ORDER: AdmissionUiStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "test_interview",
  "admitted",
  "rejected",
  "waitlisted",
  "withdrawn",
]

export const ADMISSION_STATUS_LABELS: Record<AdmissionUiStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  test_interview: "Test / Interview",
  admitted: "Admitted",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
}

export function resolveAdmissionUiStatus(app: Application): AdmissionUiStatus {
  if (app.status === "Rejected") return "rejected"
  if (app.status === "Waitlist") return "waitlisted"
  if (app.status === "Enrolled") return "admitted"
  if (app.interviewDate || app.interviewScore || app.interviewResult) {
    return "test_interview"
  }
  if (app.status === "Review") return "under_review"
  if (app.status === "New") {
    return app.submittedOn ? "submitted" : "draft"
  }
  return "submitted"
}

export function formatRegistrationNo(id: string) {
  if (/^APP-/i.test(id)) return id
  const year = new Date().getFullYear()
  const suffix = id.replace(/\D/g, "").slice(-4).padStart(4, "0")
  return `APP-${year}-${suffix}`
}

export const admissionStatusBadgeClass: Record<AdmissionUiStatus, string> = {
  draft:
    "border-transparent bg-[#f2f4f7] text-[#344054] [&_[data-status-dot]]:bg-[#667085]",
  submitted:
    "border-transparent bg-[#eff8ff] text-[#175cd3] [&_[data-status-dot]]:bg-[#2e90fa]",
  under_review:
    "border-transparent bg-[#fef6ee] text-[#b54708] [&_[data-status-dot]]:bg-[#f79009]",
  test_interview:
    "border-transparent bg-[#fffaeb] text-[#b54708] [&_[data-status-dot]]:bg-[#f79009]",
  admitted:
    "border-transparent bg-[#ecfdf3] text-[#027a48] [&_[data-status-dot]]:bg-[#12b76a]",
  rejected:
    "border-transparent bg-[#fef3f2] text-[#b42318] [&_[data-status-dot]]:bg-[#f04438]",
  waitlisted:
    "border-transparent bg-[#eef4ff] text-[#3538cd] [&_[data-status-dot]]:bg-[#6172f3]",
  withdrawn:
    "border-transparent bg-[#f9fafb] text-[#475467] [&_[data-status-dot]]:bg-[#98a2b3]",
}
