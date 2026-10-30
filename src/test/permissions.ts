import type { Role } from "@/lib/auth"
import { useAuthStore } from "@/stores/auth-store"

import { DEFAULT_ROLE_PERMISSIONS } from "./default-role-permissions.generated"

/** Gives the test session the role's default permissions, as the API would return them. */
export function grantRoleDefaults(role: Role) {
  useAuthStore.setState({ role, permissions: DEFAULT_ROLE_PERMISSIONS[role] })
}
