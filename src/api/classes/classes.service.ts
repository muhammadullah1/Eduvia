import { api } from "@/lib/api"

export type ClassDto = {
  id: number
  fkSessionId: number
  grade: string
  section: string
  label: string
  room: string | null
  periodCount: number
  monthlyTuitionFee?: number | string
  monthlyFee?: number
  status?: "Active" | "Archived"
  capacity?: number
}

export type CreateClassBody = {
  fkSessionId: number
  grade: string
  section: string
  label: string
  room?: string | null
  periodCount?: number
  monthlyFee?: number
}

export type UpdateClassBody = Partial<CreateClassBody>

const classesService = {
  list: (params?: { sessionId?: number }) =>
    api.get<ClassDto[]>("/classes", params),

  create: (body: CreateClassBody) =>
    api.post<ClassDto>("/classes", body),

  update: (id: number, body: UpdateClassBody) =>
    api.patch<ClassDto>(`/classes/${id}`, body),

  remove: (id: number) => api.delete<void>(`/classes/${id}`),
}

export default classesService
