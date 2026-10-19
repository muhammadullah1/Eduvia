import { api } from "@/lib/api"
import type { ApiSubject } from "@/lib/api-types"

export type CreateSubjectBody = {
  name: string
  code: string
  category?: string | null
  isActive?: boolean
}

export type UpdateSubjectBody = Partial<CreateSubjectBody>

const subjectsService = {
  list: (params?: { archived?: boolean; search?: string; classId?: number }) =>
    api.get<ApiSubject[]>("/subjects", {
      archived: params?.archived ? "1" : undefined,
      search: params?.search,
      classId: params?.classId,
    }),

  create: (body: CreateSubjectBody) =>
    api.post<ApiSubject>("/subjects", body),

  update: (id: number, body: UpdateSubjectBody) =>
    api.patch<ApiSubject>(`/subjects/${id}`, body),

  remove: (id: number) => api.delete<void>(`/subjects/${id}`),

  restore: (id: number) => api.post<ApiSubject>(`/subjects/${id}/restore`, {}),
}

export default subjectsService
