import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

export const SESSION_QUERY_KEY = ["auth", "me"] as const

/** How often an open tab re-reads its role and permissions, so a Super Admin's edit reaches it without a reload. */
const SESSION_REFRESH_MS = 60_000

/** A tab regaining focus re-reads the session at most this often (focus and visibility often fire together). */
export const SESSION_FOCUS_THROTTLE_MS = 10_000

/**
 * Keeps the signed-in role and effective permissions in step with the API (`GET /auth/me`): on
 * mount, every minute, and when the tab becomes visible or the window regains focus (throttled),
 * so menus follow a permission change made elsewhere. Returns false only while a session saved
 * by an older build has no permissions yet.
 */
export function useSessionSync() {
  const permissionCount = useAuthStore((state) => state.permissions.length)
  const me = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: api.me,
    // Focus is handled below for both `focus` and `visibilitychange`, with one throttle.
    refetchOnWindowFocus: false,
    refetchInterval: SESSION_REFRESH_MS,
  })
  const { refetch, dataUpdatedAt } = me

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - dataUpdatedAt < SESSION_FOCUS_THROTTLE_MS) return
      void refetch()
    }
    window.addEventListener("focus", refreshIfStale)
    document.addEventListener("visibilitychange", refreshIfStale)
    return () => {
      window.removeEventListener("focus", refreshIfStale)
      document.removeEventListener("visibilitychange", refreshIfStale)
    }
  }, [refetch, dataUpdatedAt])

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
