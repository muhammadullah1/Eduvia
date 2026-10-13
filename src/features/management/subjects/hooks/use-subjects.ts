import { useQuery, useQueryClient } from "@tanstack/react-query"

import { SUBJECTS_QUERY_KEY } from "@/api/subjects/constants"
import { mapSubjectDto } from "@/api/subjects/map-subject"
import subjectsService from "@/api/subjects/subjects.service"
import { loadAuth } from "@/lib/auth"

export function useSubjectsList() {
  return useQuery({
    queryKey: [SUBJECTS_QUERY_KEY],
    enabled: Boolean(loadAuth()?.token),
    queryFn: async () => {
      const rows = await subjectsService.list()
      return (rows ?? []).map(mapSubjectDto)
    },
  })
}

export function invalidateSubjectsList(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return queryClient.invalidateQueries({ queryKey: [SUBJECTS_QUERY_KEY] })
}
