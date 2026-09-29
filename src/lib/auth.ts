export type Role = "management" | "controller" | "accountant" | "teacher" | "parent"

const AUTH_KEY = "eduvia-auth"

export type AuthSession = {
  role: Role
}

const ALL_ROLES: Role[] = ["management", "controller", "accountant", "teacher", "parent"]

export function loadAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!ALL_ROLES.includes(parsed.role)) return null
    return parsed
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
  management: "dashboard",
  controller: "oversight",
  accountant: "fees",
  teacher: "today",
  parent: "home",
}

export function portalPath(role: Role, section?: string, rest?: string) {
  const base = `/${role}/${section ?? defaultSection[role]}`
  return rest ? `${base}/${rest}` : base
}
