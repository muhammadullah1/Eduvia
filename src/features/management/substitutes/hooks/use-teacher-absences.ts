import { useQuery } from "@tanstack/react-query"

import teacherAbsencesService from "@/api/teacher-absences/teacher-absences.service"

export const TEACHER_ABSENCES_QUERY_KEY = "teacher-absences"

export function useTeacherAbsencesForDate(date: string) {
  return useQuery({
    queryKey: [TEACHER_ABSENCES_QUERY_KEY, date],
    queryFn: async () => {
      const rows = await teacherAbsencesService.list({ date })
      return teacherAbsencesService.mapList(rows ?? [])
    },
    staleTime: 15_000,
  })
}

export function useSubstitutionLog(enabled = true) {
  return useQuery({
    queryKey: [TEACHER_ABSENCES_QUERY_KEY, "log"],
    enabled,
    queryFn: async () => {
      const rows = await teacherAbsencesService.list()
      return teacherAbsencesService.mapList(rows ?? [])
    },
    staleTime: 30_000,
  })
}
