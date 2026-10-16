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
  periodStartTimes?: Record<string, string> | null
  studentCount?: number
  subjectCount?: number
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

export type UpdateClassBody = Partial<CreateClassBody> & {
  periodStartTimes?: Record<string, string> | null
}

const classesService = {
  list: (params?: {
    sessionId?: number
    stats?: boolean
    archived?: boolean
  }) =>
    api.get<ClassDto[]>("/classes", {
      sessionId: params?.sessionId,
      stats: params?.stats ? "1" : undefined,
      archived: params?.archived ? "1" : undefined,
    }),

  create: (body: CreateClassBody) =>
    api.post<ClassDto>("/classes", body),

  update: (id: number, body: UpdateClassBody) =>
    api.patch<ClassDto>(`/classes/${id}`, body),

  remove: (id: number) => api.delete<void>(`/classes/${id}`),

  restore: (id: number) =>
    api.post<ClassDto>(`/classes/${id}/restore`, {}),
}

export default classesService
