import type { PermissionKey } from "@/lib/permission-keys.generated"
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from "@/stores/auth-store"

/** Operational roles (SRS Addendum v1.1 · UR-01). Values mirror the API `users.role` enum. */
export type Role =
  "super_admin" | "operations_manager" | "accountant" | "teacher" | "parent"

export const ALL_ROLES: Role[] = [
  "super_admin",
  "operations_manager",
  "accountant",
  "teacher",
  "parent",
]

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operations Manager",
  accountant: "Accountant",
  teacher: "Teacher",
  parent: "Parent",
}

/** URL slug of each portal. Super Admin, Operations Manager and Accountant share `/admin`. */
export type PortalSlug = "admin" | "teacher" | "parent"

const PORTAL_BY_ROLE: Record<Role, PortalSlug> = {
  super_admin: "admin",
  operations_manager: "admin",
  accountant: "admin",
  teacher: "teacher",
  parent: "parent",
}

/** Portals of earlier builds; their links now open the staff portal. */
export const LEGACY_PORTAL_SLUGS = new Set(["operations", "accountant", "management", "controller"])

const PORTAL_SLUGS = new Set<string>(Object.values(PORTAL_BY_ROLE))

export type AuthUser = {
  id: number
  fkSchoolId?: number
  firstName: string
  lastName: string
  email: string
  role: Role
  phone?: string | null
}

export type AuthSession = {
  role: Role
  token?: string
  user?: AuthUser | null
  permissions?: PermissionKey[]
}

export function portalForRole(role: Role): PortalSlug {
  return PORTAL_BY_ROLE[role]
}

export function isPortalSlug(slug: string | undefined): slug is PortalSlug {
  return slug !== undefined && PORTAL_SLUGS.has(slug)
}

export function loadAuth(): AuthSession | null {
  const fromStore = readAuthSession()
  if (fromStore?.token) return fromStore
  return null
}

export function saveAuth(session: AuthSession) {
  writeAuthSession(session)
}

export function clearAuth() {
  clearAuthSession()
}

export const defaultSection: Record<Role, string> = {
  super_admin: "dashboard",
  operations_manager: "dashboard",
  accountant: "dashboard",
  teacher: "today",
  parent: "home",
}

export function portalPath(role: Role, section?: string, rest?: string) {
  const base = `/${PORTAL_BY_ROLE[role]}/${section ?? defaultSection[role]}`
  if (rest) return `${base}/${rest}`
  return base
}
