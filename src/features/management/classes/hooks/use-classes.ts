import { useQuery, useQueryClient } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import { CLASSES_QUERY_KEY } from "@/api/classes/constants"
import { mapClassDto } from "@/api/classes/map-class"
import type { ClassSection } from "@/data/types"
import { loadAuth } from "@/lib/auth"

export function useClassesList(sessionId?: number) {
  return useQuery({
    queryKey: [CLASSES_QUERY_KEY, sessionId ?? "current"],
    enabled: Boolean(loadAuth()?.token),
    queryFn: async () => {
      const rows = await classesService.list(
        sessionId ? { sessionId } : undefined
      )
      return rows.map(mapClassDto)
    },
  })
}

export function invalidateClassesList(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] })
}

export type ClassRow = ClassSection & {
  studentCount: number
  subjectCount: number
  status: "Active" | "Archived"
}
