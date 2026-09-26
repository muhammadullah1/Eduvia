export type Role = "management" | "teacher" | "parent"

const AUTH_KEY = "eduvia-auth"

export type AuthSession = {
  role: Role
}

export function loadAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (parsed.role !== "management" && parsed.role !== "teacher" && parsed.role !== "parent") return null
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
  teacher: "today",
  parent: "home",
}

export function portalPath(role: Role, section?: string, rest?: string) {
  const base = `/${role}/${section ?? defaultSection[role]}`
  return rest ? `${base}/${rest}` : base
}
