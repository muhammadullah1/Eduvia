import { useQueryClient } from "@tanstack/react-query"

import { LIFECYCLE_HISTORY_QUERY_KEY, LIFECYCLE_QUERY_KEY } from "@/api/students/lifecycle.service"
import { PROMOTION_HISTORY_QUERY_KEY } from "@/api/students/promotions.service"

/** Everything a status change or promotion can make stale. */
export function useRefreshLifecycle() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [["students"], ["classes"], [LIFECYCLE_QUERY_KEY], [LIFECYCLE_HISTORY_QUERY_KEY], [PROMOTION_HISTORY_QUERY_KEY]].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey })
      )
    )
}

export const money = (value: number) =>
  value.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
