import { useParams } from "react-router-dom"

import { RoleEditPage } from "./role-edit-page"
import { RolesPage } from "./roles-page"

/** `/admin/roles` lists roles; `/admin/roles/<roleKey>` edits one role's permissions. */
export function RolesSection() {
  const { "*": rest } = useParams()
  if (rest) return <RoleEditPage roleKey={rest} />
  return <RolesPage />
}
