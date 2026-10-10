import type { AdmissionStatusFilter } from "@/features/management/admissions/admission-display"
import type { ListApplicationsRequest } from "@/types/admissions/api/request"

export function buildApplicationsListRequest(input: {
  page: number
  pageSize: number
  q?: string
  statusFilter: AdmissionStatusFilter
}): ListApplicationsRequest {
  const q = input.q?.trim() || undefined
  const params: ListApplicationsRequest = {
    page: input.page,
    pageSize: input.pageSize,
    q,
  }

  switch (input.statusFilter) {
    case "under_review":
      params.status = "Review"
      break
    case "admitted":
      params.status = "Enrolled"
      break
    case "rejected":
      params.status = "Rejected"
      break
    case "waitlisted":
      params.status = "Waitlist"
      break
    case "draft":
      params.status = "New"
      params.submitted = "false"
      break
    case "submitted":
      params.status = "New"
      params.submitted = "true"
      break
    case "test_interview":
      params.hasInterview = "true"
      break
    default:
      break
  }

  return params
}
