import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"
import { api } from "@/lib/api"
import type {
  DecideApplicationRequest,
  ListApplicationsRequest,
  UpsertApplicationBody,
} from "@/types/admissions/api/request"
import type {
  ApplicationDto,
  EnrollApplicationData,
  ListApplicationsData,
} from "@/types/admissions/api/response"

function cleanListParams(params?: ListApplicationsRequest) {
  const next: Record<string, string | number> = {}
  if (!params) return next
  if (params.status) next.status = params.status
  if (params.submitted) next.submitted = params.submitted
  if (params.hasInterview) next.hasInterview = params.hasInterview
  if (params.decision) next.decision = params.decision
  if (params.page) next.page = params.page
  next.pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const q = params.q?.trim()
  if (q) next.q = q
  return next
}

/** One required admission document; the API owns the list (single source). */
export type AdmissionChecklistItem = {
  label: string
  status: "Pending"
}

export type ApplicationStatusCounts = {
  all: number
  draft: number
  submitted: number
  under_review: number
  test_interview: number
  admitted: number
  rejected: number
  waitlisted: number
  withdrawn: number
}

const applicationsService = {
  list: (params?: ListApplicationsRequest) =>
    api.get<ListApplicationsData>("/applications", cleanListParams(params)),

  summary: () => api.get<ApplicationStatusCounts>("/applications/summary"),

  documentChecklist: () =>
    api.get<AdmissionChecklistItem[]>("/applications/document-checklist"),

  getById: (id: number) => api.get<ApplicationDto>(`/applications/${id}`),

  createDraft: (body: UpsertApplicationBody) =>
    api.post<ApplicationDto>("/applications/drafts", body),

  create: (body: UpsertApplicationBody) =>
    api.post<ApplicationDto>("/applications", body),

  update: (id: number, body: UpsertApplicationBody) =>
    api.patch<ApplicationDto>(`/applications/${id}`, body),

  submit: (id: number) =>
    api.post<ApplicationDto>(`/applications/${id}/submit`, {}),

  review: (id: number) =>
    api.post<ApplicationDto>(`/applications/${id}/review`, {}),

  decide: (id: number, body: DecideApplicationRequest) =>
    api.post<ApplicationDto>(`/applications/${id}/decide`, body),

  enroll: (id: number, body: Record<string, unknown> = {}) =>
    api.post<EnrollApplicationData>(`/applications/${id}/enroll`, body),

  /** Short-lived signed link to a stored document (access checked by the API). */
  documentUrl: (applicationId: number, documentId: number) =>
    api.get<{ url: string; expiresIn: number }>(
      `/applications/${applicationId}/documents/${documentId}/url`
    ),

  clearDocument: (applicationId: number, documentId: number) =>
    api.delete<ApplicationDto>(
      `/applications/${applicationId}/documents/${documentId}`
    ),
}

export default applicationsService
