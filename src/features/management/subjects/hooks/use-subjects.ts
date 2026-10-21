import { useQuery, useQueryClient } from "@tanstack/react-query"

import { SUBJECTS_QUERY_KEY } from "@/api/subjects/constants"
import { mapSubjectDto } from "@/api/subjects/map-subject"
import subjectsService from "@/api/subjects/subjects.service"
import { loadAuth } from "@/lib/auth"

export function useSubjectsList(classId?: number) {
  const scoped = Number.isFinite(classId) && (classId ?? 0) > 0
  return useQuery({
    queryKey: [SUBJECTS_QUERY_KEY, scoped ? classId : "all"],
    enabled: Boolean(loadAuth()?.token),
    queryFn: async () => {
      const rows = await subjectsService.list(
        scoped ? { classId } : undefined
      )
      return (rows ?? []).map(mapSubjectDto)
    },
  })
}

export function invalidateSubjectsList(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] })
}
