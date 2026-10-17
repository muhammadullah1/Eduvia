import { useQuery } from "@tanstack/react-query"

import teacherAbsencesService from "@/api/teacher-absences/teacher-absences.service"

export function useAvailableSubstitutes(absenceId: string | null) {
  const numericId = absenceId ? Number(absenceId) : NaN
  const enabled = Number.isFinite(numericId) && numericId > 0

  return useQuery({
    queryKey: ["available-substitutes", absenceId],
    enabled,
    queryFn: async () => {
      const data = await teacherAbsencesService.availableSubstitutes(numericId)
      const busyTeacherIds = new Set<number>()
      return {
        free: (data.teachers ?? []).map((t) => ({
          id: String(t.id),
          name: t.name,
          subject: t.subject?.name ?? "",
          sameSubject: Boolean(t.sameSubject),
        })),
        busyTeacherIds,
      }
    },
    staleTime: 10_000,
  })
}
