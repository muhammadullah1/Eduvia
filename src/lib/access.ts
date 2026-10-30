import { useCallback } from "react"

import type { PermissionKey } from "@/lib/permission-keys.generated"
import { useAuthStore } from "@/stores/auth-store"

export type { PermissionKey }

export type Can = (key: PermissionKey) => boolean

export function holds(permissions: readonly PermissionKey[], key: PermissionKey) {
  return permissions.includes(key)
}

/** The signed-in user's effective permissions (from the API), re-rendering when they change. */
export function usePermissions(): readonly PermissionKey[] {
  return useAuthStore((state) => state.permissions)
}

/** `can(key)` for components: true when the signed-in user's role currently holds `key`. */
export function useCan(): Can {
  const permissions = usePermissions()
  return useCallback((key: PermissionKey) => holds(permissions, key), [permissions])
}

/** Non-React check (store actions, helpers) against the same session permissions. */
export function canNow(key: PermissionKey) {
  return holds(useAuthStore.getState().permissions, key)
}
