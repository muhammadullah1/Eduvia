import type { ReviewStatus } from "@/data/types"
import { api } from "@/lib/api"

export type DailyLessonDto = {
  id: number
  date: string
  title?: string | null
  classwork?: string | null
  homework?: string | null
  remarks?: string | null
  reviewStatus: ReviewStatus
  reviewNote?: string | null
  fkClassId: number
  fkSubjectId: number
  class?: { id: number; label: string } | null
  subject?: { id: number; name: string } | null
  chapter?: { id: number; chapterNo?: number; title: string } | null
  teacher?: {
    id: number
    user?: { firstName: string; lastName: string; email?: string } | null
  } | null
}

export type DailyLessonContent = {
  classwork: string
  homework: string
  remarks: string
}

export type CreateDailyLessonInput = DailyLessonContent & {
  classId: number
  plannedChapterId: number
  date: string
}

export type ReviewLessonInput = {
  decision: "Approved" | "Rejected"
  note?: string
}

const dailyLessonsService = {
  list: (query?: {
    classId?: number
    subjectId?: number
    date?: string
    from?: string
    to?: string
    reviewStatus?: string
  }) => api.get<DailyLessonDto[]>("/daily-lessons", query),

  create: (body: CreateDailyLessonInput) =>
    api.post<DailyLessonDto>("/daily-lessons", body),

  update: (id: number, body: DailyLessonContent & { plannedChapterId: number }) =>
    api.patch<DailyLessonDto>(`/daily-lessons/${id}`, body),

  review: (id: number, body: ReviewLessonInput) =>
    api.post<DailyLessonDto>(`/daily-lessons/${id}/review`, body),
}

export default dailyLessonsService
