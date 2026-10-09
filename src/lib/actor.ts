import { useParams } from "react-router-dom"

import { loadAuth, roleFromSlug, type Role } from "@/lib/auth"

export type Actor = { role: Role; name: string }

/** The signed-in user. The URL role is only a fallback before the session loads. */
export function useActor(): Actor {
  const session = loadAuth()
  const role = session?.user?.role ?? roleFromSlug(useParams().role) ?? "super_admin"
  const name = session?.user ? `${session.user.firstName} ${session.user.lastName}`.trim() : role
  return { role, name }
}
