import { useQuery } from "@tanstack/react-query"

import teacherAbsencesService from "@/api/teacher-absences/teacher-absences.service"

/** Classes and free cover teachers for each chosen period, before saving. */
export function useCoverPreview(
  draft: { teacherId: string; date: string; periods: number[] } | null
) {
  const teacherId = Number(draft?.teacherId)
  return useQuery({
    queryKey: ["available-substitutes", "preview", draft],
    enabled: Boolean(draft && Number.isFinite(teacherId) && draft.periods.length),
    queryFn: async () => {
      const data = await teacherAbsencesService.coverPreview({
        teacherId,
        date: draft?.date ?? "",
        periods: draft?.periods ?? [],
      })
      return data.periods
    },
    staleTime: 10_000,
  })
}
