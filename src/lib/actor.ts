import type { Role } from "@/lib/auth"
import { useAuthStore } from "@/stores/auth-store"

export type Actor = { role: Role; name: string }

/** The signed-in user (portal routes are only rendered behind RequireAuth). */
export function useActor(): Actor {
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  let name: string = role
  if (user) name = `${user.firstName} ${user.lastName}`.trim()
  return { role, name }
}
