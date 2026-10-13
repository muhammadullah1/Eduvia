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
  list: () => api.get<ApiSubject[]>("/subjects"),

  create: (body: CreateSubjectBody) =>
    api.post<ApiSubject>("/subjects", body),

  update: (id: number, body: UpdateSubjectBody) =>
    api.patch<ApiSubject>(`/subjects/${id}`, body),
}

export default subjectsService
