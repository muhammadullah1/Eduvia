import { useQuery, useQueryClient } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import { CLASSES_QUERY_KEY } from "@/api/classes/constants"
import { mapClassDto } from "@/api/classes/map-class"
import type { ClassSection, ClassStatus } from "@/data/types"
import { loadAuth } from "@/lib/auth"

export function useClassesList(
  sessionId?: number,
  options?: { archived?: boolean }
) {
  const archived = options?.archived ?? false
  const sessionReady =
    sessionId !== undefined && Number.isFinite(sessionId) && sessionId > 0
  return useQuery({
    queryKey: [
      CLASSES_QUERY_KEY,
      sessionReady ? sessionId : "pending",
      archived ? "archived" : "active",
    ],
    enabled: Boolean(loadAuth()?.token) && sessionReady,
    queryFn: async () => {
      const rows = await classesService.list({
        sessionId,
        stats: !archived,
        archived,
      })
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
  status: ClassStatus
}
