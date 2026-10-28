import { api } from "@/lib/api"
import type { UpdateKind, UpdateStatus } from "@/data/types"

export type SchoolUpdateDto = {
  id: string
  classId: number
  kind: UpdateKind
  subject: string
  text: string
  status: UpdateStatus
  due?: string
  author: string
  authorUserId?: number
  createdAt?: string
}

export type CreateUpdateInput = {
  classId: number
  kind: UpdateKind
  subject: string
  text: string
  due?: string
}

const updatesService = {
  list: (query?: { classId?: number; status?: string; kind?: string }) =>
    api.get<SchoolUpdateDto[]>("/updates", query),

  create: (body: CreateUpdateInput) =>
    api.post<SchoolUpdateDto>("/updates", body),

  setStatus: (id: string, status: UpdateStatus) =>
    api.patch<SchoolUpdateDto>(`/updates/${id}/status`, { status }),

  remove: (id: string) => api.delete<{ id: string }>(`/updates/${id}`),
}

export default updatesService
