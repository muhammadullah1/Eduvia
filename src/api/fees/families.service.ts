import { api } from "@/lib/api"

export type FamilyMember = {
  id: number
  studentId: number
  status: "Active" | "Removed"
  linkedVia: "manual" | "shared_parent_suggestion"
  student?: {
    id: number
    firstName: string
    lastName: string
    admissionNo: string
  }
}

export type Family = {
  id: number
  displayName: string
  primaryParentId: number | null
  verifiedAt: string | null
  verified: boolean
  members: FamilyMember[]
}

export type FamilySuggestion = {
  studentId: number
  firstName: string
  lastName: string
  admissionNo: string
  linkedVia: "shared_parent_suggestion"
}

export const FAMILIES_QUERY_KEY = "families"

const familiesService = {
  list: () => api.get<Family[]>("/families"),
  get: (id: number) => api.get<Family>(`/families/${id}`),
  create: (body: { displayName: string; primaryParentId?: number | null; studentIds?: number[] }) =>
    api.post<Family>("/families", body),
  verify: (id: number) => api.post<Family>(`/families/${id}/verify`),
  addMember: (id: number, body: { studentId: number; linkedVia?: string }) =>
    api.post<Family>(`/families/${id}/members`, body),
  removeMember: (id: number, studentId: number) =>
    api.delete<Family>(`/families/${id}/members/${studentId}`),
  suggest: (id: number) => api.get<FamilySuggestion[]>(`/families/${id}/suggest-members`),
}

export default familiesService
