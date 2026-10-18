import { api } from "@/lib/api"
import {
  mapTeacherAbsencesFromApi,
  type AbsenceRow,
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

const teacherAbsencesService = {
  list: (query?: { date?: string; teacherId?: number; status?: string }) =>
    api.get<AbsenceRow[]>("/teacher-absences", query),

  markAbsent: (body: MarkAbsentBody) =>
    api.post<AbsenceRow[]>("/teacher-absences", body),

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
