import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

export const SESSION_QUERY_KEY = ["auth", "me"] as const

/** How often an open tab re-reads its role and permissions, so a Super Admin's edit reaches it without a reload. */
const SESSION_REFRESH_MS = 60_000

/**
 * Keeps the signed-in role and effective permissions in step with the API (`GET /auth/me`).
 * Returns false only while a session saved by an older build has no permissions yet.
 */
export function useSessionSync() {
  const permissionCount = useAuthStore((state) => state.permissions.length)
  const me = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: api.me,
    refetchOnWindowFocus: true,
    refetchInterval: SESSION_REFRESH_MS,
  })

  useEffect(() => {
    if (!me.data) return
    const { token } = useAuthStore.getState()
    useAuthStore.getState().setSession({
      role: me.data.user.role,
      token,
      user: me.data.user,
      permissions: me.data.permissions,
    })
  }, [me.data])

  return permissionCount > 0 || !me.isPending
}
