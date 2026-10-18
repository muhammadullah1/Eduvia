import { api } from "@/lib/api"

export type ChapterStatus = "Planned" | "InProgress" | "Completed"

export type PlannedChapterDto = {
  id: number
  fkClassId: number
  fkSubjectId: number
  chapterNo?: number
  sequence?: number
  title: string
  status: ChapterStatus
  plannedEndDate?: string | null
  class?: { id: number; label: string }
  subject?: { id: number; name: string }
}

const plannedChaptersService = {
  list: (query?: { classId?: number; subjectId?: number }) =>
    api.get<PlannedChapterDto[]>("/planned-chapters", query),

  create: (body: {
    fkClassId: number
    fkSubjectId: number
    title: string
    targetDate?: string | null
    status?: ChapterStatus
  }) => api.post<PlannedChapterDto>("/planned-chapters", body),

  update: (
    id: number,
    body: {
      title?: string
      status?: ChapterStatus
      targetDate?: string | null
    }
  ) => api.patch<PlannedChapterDto>(`/planned-chapters/${id}`, body),

  remove: (id: number) => api.delete<unknown>(`/planned-chapters/${id}`),

  reorder: (body: {
    classId: number
    subjectId: number
    orderedIds: number[]
  }) => api.post<PlannedChapterDto[]>("/planned-chapters/reorder", body),
}

export default plannedChaptersService
