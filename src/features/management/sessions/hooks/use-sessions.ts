import { useQuery, useQueryClient } from "@tanstack/react-query"

import { SESSIONS_QUERY_KEY } from "@/api/sessions/constants"
import { mapSessionDto } from "@/api/sessions/map-session"
import sessionsService from "@/api/sessions/sessions.service"
import type { AcademicSession } from "@/data/types"
import { loadAuth } from "@/lib/auth"

export function useSessionsList() {
  return useQuery({
    queryKey: [SESSIONS_QUERY_KEY],
    enabled: Boolean(loadAuth()?.token),
    queryFn: async () => {
      const rows = await sessionsService.list()
      return rows.map(mapSessionDto)
    },
  })
}

export function invalidateSessionsList(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
}

export type { AcademicSession }
