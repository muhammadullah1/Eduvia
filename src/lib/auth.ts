/** Operational roles (SRS Addendum v1.1 · UR-01). Values mirror the API `users.role` enum. */
export type Role = "super_admin" | "operations_manager" | "accountant" | "teacher" | "parent"

export const ALL_ROLES: Role[] = ["super_admin", "operations_manager", "accountant", "teacher", "parent"]

/** URL slug per role: `/admin/...`, `/operations/...`, `/accountant/...`, `/teacher/...`, `/parent/...`. */
const ROLE_SLUGS: Record<Role, string> = {
  super_admin: "admin",
  operations_manager: "operations",
  accountant: "accountant",
  teacher: "teacher",
  parent: "parent",
}

/** Role names stored by earlier builds of the demo. */
const LEGACY_ROLES: Record<string, Role> = {
  management: "super_admin",
  controller: "operations_manager",
}

const AUTH_KEY = "eduvia-auth"

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
}

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null
  if ((ALL_ROLES as string[]).includes(value)) return value as Role
  return LEGACY_ROLES[value] ?? null
}

export function roleFromSlug(slug: string | undefined): Role | null {
  if (!slug) return null
  const match = ALL_ROLES.find((role) => ROLE_SLUGS[role] === slug)
  return match ?? LEGACY_ROLES[slug] ?? null
}

export function loadAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { role?: unknown; token?: string; user?: AuthUser }
    const role = normalizeRole(parsed.role)
    return role ? { role, token: parsed.token, user: parsed.user } : null
  } catch {
    return null
  }
}

export function saveAuth(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

export const defaultSection: Record<Role, string> = {
  super_admin: "dashboard",
  operations_manager: "overview",
  accountant: "collect",
  teacher: "today",
  parent: "home",
}

export function portalPath(role: Role, section?: string, rest?: string) {
  const base = `/${ROLE_SLUGS[role]}/${section ?? defaultSection[role]}`
  return rest ? `${base}/${rest}` : base
}
