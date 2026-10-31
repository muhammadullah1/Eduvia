import type { PermissionKey } from "@/lib/access"
import { api } from "@/lib/api"
import type { PortalSlug, Role } from "@/lib/auth"

export type PermissionRisk = "low" | "medium" | "high"

export type PermissionModule = {
  key: string
  label: string
  description: string
  sensitive: boolean
}

export type CatalogPermission = {
  key: PermissionKey
  module: string
  action: string
  label: string
  description: string
  risk: PermissionRisk
}

export type PermissionCatalog = {
  actions: string[]
  modules: PermissionModule[]
  permissions: CatalogPermission[]
}

export type RoleSummary = {
  id: number
  key: Role
  label: string
  description: string | null
  portal: PortalSlug
  isSystem: boolean
  version: number
  userCount: number
  permissionCount: number
}

export type RolePermissionState = {
  key: PermissionKey
  granted: boolean
  isDefault: boolean
  /** Why this switch cannot be turned on for the role; null when it is editable. */
  lockReason: string | null
}

export type RoleDetail = RoleSummary & { permissions: RolePermissionState[] }

export type RoleUser = {
  id: number
  name: string
  email: string
  status: string
  role: Role
}

export type SavePermissionsBody = {
  permissions: PermissionKey[]
  reason: string
  version: number
}

const rolesService = {
  catalog: () => api.get<PermissionCatalog>("/roles/catalog"),
  list: () => api.get<RoleSummary[]>("/roles"),
  get: (id: number) => api.get<RoleDetail>(`/roles/${id}`),
  users: (id: number) => api.get<RoleUser[]>(`/roles/${id}/users`),
  updatePermissions: (id: number, body: SavePermissionsBody) =>
    api.put<RoleDetail>(`/roles/${id}/permissions`, body),
  reset: (id: number, body: { reason: string; version: number }) =>
    api.post<RoleDetail>(`/roles/${id}/reset`, body),
  changeUserRole: (userId: number, body: { role: Role; reason: string }) =>
    api.patch<{ id: number; role: Role }>(`/roles/users/${userId}`, body),
}

export default rolesService
