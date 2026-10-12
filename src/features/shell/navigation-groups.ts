import type { Role } from "@/lib/auth"

import { navigation } from "./navigation"

export type NavGroup = {
  label?: string
  itemIds: string[]
}

/** CLS SMS sidebar (Figma node 12:18007) */
const SUPER_ADMIN_GROUPS: NavGroup[] = [
  { itemIds: ["dashboard"] },
  {
    label: "Academic Management",
    itemIds: [
      "sessions",
      "classes",
      "subjects",
      "teachers-assignments",
      "timetable",
      "substitutes",
      "lesson-plan",
      "daily-test-schedule",
    ],
  },
  {
    label: "Student Management",
    itemIds: [
      "admissions",
      "students",
      "enrollment-promotion",
      "lifecycle",
      "student-attendance",
      "exams",
      "fees",
      "collect-fee",
      "offline-sync",
    ],
  },
  { itemIds: ["finance", "reports"] },
  {
    label: "System",
    itemIds: ["settings", "messages"],
  },
]

const OPERATIONS_GROUPS: NavGroup[] = [
  { itemIds: ["overview"] },
  {
    label: "Academic Management",
    itemIds: [
      "sessions",
      "classes",
      "subjects",
      "teachers-assignments",
      "timetable",
      "substitutes",
      "lesson-plan",
      "daily-test-schedule",
    ],
  },
  {
    label: "Student Management",
    itemIds: [
      "admissions",
      "students",
      "enrollment-promotion",
      "lifecycle",
      "student-attendance",
      "exams",
    ],
  },
  { itemIds: ["messages", "settings", "reports"] },
]

const ACCOUNTANT_GROUPS: NavGroup[] = [
  {
    label: "Fee Management",
    itemIds: ["collect", "collections"],
  },
]

const TEACHER_GROUPS: NavGroup[] = [
  { itemIds: ["today", "classes", "attendance", "daily-update", "weekly-tests", "notices", "marks"] },
]

const PARENT_GROUPS: NavGroup[] = [
  {
    itemIds: [
      "home",
      "attendance",
      "results",
      "tests",
      "fees",
      "timetable",
      "updates",
    ],
  },
]

const GROUPS_BY_ROLE: Partial<Record<Role, NavGroup[]>> = {
  super_admin: SUPER_ADMIN_GROUPS,
  operations_manager: OPERATIONS_GROUPS,
  accountant: ACCOUNTANT_GROUPS,
  teacher: TEACHER_GROUPS,
  parent: PARENT_GROUPS,
}

export function navigationGroupsForRole(role: Role): NavGroup[] {
  const allowed = new Set(navigation[role].map((item) => item.id))
  const groups =
    GROUPS_BY_ROLE[role] ?? [
      { itemIds: navigation[role].map((item) => item.id) },
    ]

  return groups
    .map((group) => ({
      ...group,
      itemIds: group.itemIds.filter((id) => allowed.has(id)),
    }))
    .filter((group) => group.itemIds.length > 0)
}
