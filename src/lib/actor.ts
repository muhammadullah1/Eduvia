import { useParams } from "react-router-dom"

import { roleFromSlug, type Role } from "@/lib/auth"

export type Actor = { role: Role; name: string }

/** Demo user behind each portal (matches the API seed users). */
export const DEMO_USERS: Record<Role, string> = {
  super_admin: "Ayesha Khan",
  operations_manager: "Imran Shah",
  accountant: "Nadia Iqbal",
  teacher: "Hassan Ali",
  parent: "Sara Ahmed",
}

/** The signed-in actor for the portal in the current URL. */
export function useActor(): Actor {
  const role = roleFromSlug(useParams().role) ?? "super_admin"
  return { role, name: DEMO_USERS[role] }
}
