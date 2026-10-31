import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { PermissionKey } from "@/lib/permission-keys.generated"

type Role =
  | "super_admin"
  | "operations_manager"
  | "accountant"
  | "teacher"
  | "parent"

type AuthUser = {
  id: number
  fkSchoolId?: number
  firstName: string
  lastName: string
  email: string
  role: Role
  phone?: string | null
}

type AuthSession = {
  role: Role
  token?: string
  user?: AuthUser | null
  /** Effective permissions from the API (`/auth/login`, `/auth/me`); never derived from the role. */
  permissions?: PermissionKey[]
}

type AuthStore = AuthSession & {
  permissions: PermissionKey[]
  setSession: (session: AuthSession) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      role: "super_admin",
      token: undefined,
      user: null,
      permissions: [],
      setSession: (session) =>
        set({
          role: session.role,
          token: session.token,
          user: session.user ?? null,
          permissions: session.permissions ?? [],
        }),
      logout: () =>
        set({
          role: "super_admin",
          token: undefined,
          user: null,
          permissions: [],
        }),
    }),
    {
      name: "eduvia-auth",
      partialize: (state) => ({
        role: state.role,
        token: state.token,
        user: state.user,
        permissions: state.permissions,
      }),
    }
  )
)

const LEGACY_AUTH_KEY = "eduvia-auth"

function readLegacyAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LEGACY_AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: AuthSession
      role?: Role
      token?: string
      user?: AuthUser | null
    }
    if (parsed.state?.token) return parsed.state
    if (parsed.token && parsed.role) {
      return {
        role: parsed.role,
        token: parsed.token,
        user: parsed.user ?? null,
      }
    }
  } catch {
    return null
  }
  return null
}

export function readAuthSession(): AuthSession | null {
  const { role, token, user, permissions } = useAuthStore.getState()
  if (token) return { role, token, user, permissions }
  const legacy = readLegacyAuth()
  if (legacy?.token) {
    useAuthStore.getState().setSession(legacy)
    return legacy
  }
  return null
}

export function writeAuthSession(session: AuthSession) {
  useAuthStore.getState().setSession(session)
}

export function clearAuthSession() {
  useAuthStore.getState().logout()
}

export function authRole(): Role {
  return useAuthStore.getState().role
}
