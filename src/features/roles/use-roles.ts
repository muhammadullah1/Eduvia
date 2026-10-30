import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import auditService from "@/api/audit/audit.service"
import type { SavePermissionsBody } from "@/api/roles/roles.service"
import rolesService from "@/api/roles/roles.service"
import type { Role } from "@/lib/auth"
import { SESSION_QUERY_KEY } from "@/lib/use-session"

export const ROLES_QUERY_KEY = "roles"
export const ROLE_ENTITY = "role"
export const USER_ROLE_ENTITY = "user_role"

/** The catalog only changes with a deploy, so one fetch per page load is enough. */
const CATALOG_STALE_MS = Number.POSITIVE_INFINITY
const ACTIVITY_LIMIT = 100

export function usePermissionCatalog() {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, "catalog"],
    queryFn: rolesService.catalog,
    staleTime: CATALOG_STALE_MS,
  })
}

export function useRoles() {
  return useQuery({ queryKey: [ROLES_QUERY_KEY, "list"], queryFn: rolesService.list })
}

export function useRoleDetail(id: number | undefined) {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, "detail", id],
    queryFn: () => rolesService.get(Number(id)),
    enabled: id !== undefined,
  })
}

export function useRoleUsers(id: number | undefined) {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, "users", id],
    queryFn: () => rolesService.users(Number(id)),
    enabled: id !== undefined,
  })
}

/** Role and user-role changes, newest first, from the school audit trail. */
export function useRoleActivity() {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, "activity"],
    queryFn: async () => {
      const [roleEvents, userEvents] = await Promise.all([
        auditService.list({ entityType: ROLE_ENTITY, limit: ACTIVITY_LIMIT }),
        auditService.list({ entityType: USER_ROLE_ENTITY, limit: ACTIVITY_LIMIT }),
      ])
      return [...roleEvents, ...userEvents]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, ACTIVITY_LIMIT)
    },
  })
}

function useRefreshAfterRoleChange() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
    ])
  }
}

export function useSavePermissions(id: number) {
  const refresh = useRefreshAfterRoleChange()
  return useMutation({
    mutationFn: (body: SavePermissionsBody) => rolesService.updatePermissions(id, body),
    onSettled: refresh,
  })
}

export function useResetPermissions(id: number) {
  const refresh = useRefreshAfterRoleChange()
  return useMutation({
    mutationFn: (body: { reason: string; version: number }) => rolesService.reset(id, body),
    onSettled: refresh,
  })
}

export function useChangeUserRole() {
  const refresh = useRefreshAfterRoleChange()
  return useMutation({
    mutationFn: (input: { userId: number; role: Role; reason: string }) =>
      rolesService.changeUserRole(input.userId, { role: input.role, reason: input.reason }),
    onSuccess: refresh,
  })
}
