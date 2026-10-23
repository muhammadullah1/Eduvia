import { api } from "@/lib/api"

import {
  type AbsenceRow,
  mapTeacherAbsencesFromApi,
} from "./map-absences"

export type MarkAbsentBody = {
  teacherId: number
  date: string
  periods: number[]
  notes?: string
}

export type AvailableSubstituteTeacher = {
  id: number
  name: string
  subject?: { id: number; name: string } | null
  sameSubject?: boolean
  current?: boolean
}

export type CoverPeriod = {
  periodIndex: number
  class: { id: number; label: string } | null
  subject: { id: number; name: string } | null
  free: AvailableSubstituteTeacher[]
}

export type MarkAbsentWithCoverBody = MarkAbsentBody & {
  assignments: { periodIndex: number; substituteTeacherId: number }[]
}

const teacherAbsencesService = {
  list: (query?: { date?: string; teacherId?: number; status?: string }) =>
    api.get<AbsenceRow[]>("/teacher-absences", query),

  markAbsent: (body: MarkAbsentBody) =>
    api.post<AbsenceRow[]>("/teacher-absences", body),

  coverPreview: (query: { teacherId: number; date: string; periods: number[] }) =>
    api.get<{ periods: CoverPeriod[] }>("/teacher-absences/cover-preview", {
      teacherId: query.teacherId,
      date: query.date,
      periods: query.periods.join(","),
    }),

  /** Marks the absence and assigns every picked cover in one transaction. */
  markAbsentWithCover: (body: MarkAbsentWithCoverBody) =>
    api.post<{ absences: AbsenceRow[]; assigned: number }>(
      "/teacher-absences/bulk",
      body
    ),

  availableSubstitutes: (absenceId: number) =>
    api.get<{
      absence: AbsenceRow
      teachers: AvailableSubstituteTeacher[]
    }>(`/teacher-absences/${absenceId}/available-substitutes`),

  assignSubstitute: (
    absenceId: number,
    body: { substituteTeacherId: number; notes?: string }
  ) =>
    api.put<AbsenceRow>(`/teacher-absences/${absenceId}/substitute`, body),

  removeSubstitute: (absenceId: number) =>
    api.delete<unknown>(`/teacher-absences/${absenceId}/substitute`),

  cancel: (absenceId: number) =>
    api.post<AbsenceRow>(`/teacher-absences/${absenceId}/cancel`, {}),

  mapList(rows: AbsenceRow[]) {
    return mapTeacherAbsencesFromApi(rows)
  },
}

export default teacherAbsencesService
