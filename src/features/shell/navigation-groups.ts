import type { Role } from "@/lib/auth"

import { navigation } from "./navigation"

export type NavGroup = {
  label?: string
  itemIds: string[]
}

const SUPER_ADMIN_GROUPS: NavGroup[] = [
  { itemIds: ["dashboard"] },
  {
    label: "Academic Management",
    itemIds: ["academic", "curriculum", "lesson-review"],
  },
  {
    label: "Student Management",
    itemIds: ["admissions", "people"],
  },
  { itemIds: ["absences"] },
  { itemIds: ["weekly-tests", "exams", "results-gate"] },
  {
    label: "Fee Management",
    itemIds: ["fees"],
  },
  { itemIds: ["finance", "messages", "settings", "reports"] },
]

const OPERATIONS_GROUPS: NavGroup[] = [
  { itemIds: ["overview"] },
  {
    label: "Academic Management",
    itemIds: ["academic", "curriculum", "lesson-review"],
  },
  {
    label: "Student Management",
    itemIds: ["admissions", "people"],
  },
  { itemIds: ["absences", "weekly-tests", "exams", "results-gate", "messages", "settings", "reports"] },
]

export function navigationGroupsForRole(role: Role): NavGroup[] {
  const allowed = new Set(navigation[role].map((item) => item.id))
  const groups =
    role === "super_admin"
      ? SUPER_ADMIN_GROUPS
      : role === "operations_manager"
        ? OPERATIONS_GROUPS
        : [{ itemIds: navigation[role].map((item) => item.id) }]

  return groups
    .map((group) => ({
      ...group,
      itemIds: group.itemIds.filter((id) => allowed.has(id)),
    }))
    .filter((group) => group.itemIds.length > 0)
}
