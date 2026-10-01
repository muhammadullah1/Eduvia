import type { Role } from "@/lib/auth"

/**
 * Capability matrix mirrored from the API (`constants/permissions.js`). The API
 * enforces every rule server-side (BR-14); the portal uses the same map so the
 * demo store refuses the same actions and the UI only offers what is allowed.
 */
const PERMISSIONS = {
  "fees.totals": ["super_admin"],
  "fees.payments.record": ["super_admin", "accountant"],
  "fees.payments.confirm": ["super_admin", "accountant"],
  "fees.payments.allocate_manual": ["super_admin"],
  "fees.status.view": ["super_admin", "operations_manager", "accountant"],
  "finance.manage": ["super_admin"],
  "settings.fees": ["super_admin"],
  "settings.results": ["super_admin"],
  "settings.academic": ["super_admin", "operations_manager"],
  "staff.create.any": ["super_admin"],
  "staff.create.teacher": ["super_admin", "operations_manager"],
  "teachers.subject.change": ["super_admin", "operations_manager"],
  "academic.manage": ["super_admin", "operations_manager"],
  "chapters.manage": ["super_admin", "operations_manager"],
  "lessons.submit": ["teacher"],
  "lessons.review": ["super_admin", "operations_manager"],
  "absences.manage": ["super_admin", "operations_manager"],
  "tests.schedule": ["super_admin", "operations_manager"],
  "tests.marks": ["teacher", "super_admin", "operations_manager"],
  "tests.publish": ["super_admin", "operations_manager"],
  "exams.manage": ["super_admin", "operations_manager"],
  "results.override": ["super_admin", "operations_manager"],
  "admissions.manage": ["super_admin", "operations_manager"],
  "audit.view": ["super_admin", "operations_manager"],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operations Manager",
  accountant: "Accountant",
  teacher: "Teacher",
  parent: "Parent",
}
