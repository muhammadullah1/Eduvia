import { resolveStorageUrl } from "@/api/storage/storage.service"
import type { ApiTeacher } from "@/lib/api-types"
import type { ApiUser } from "@/lib/api-types"
import type { Role } from "@/lib/auth"

const STAFF_ROLES = new Set<Role>([
  "super_admin",
  "operations_manager",
  "accountant",
  "teacher",
])

export type StaffDirectoryRow = {
  id: string
  teacherId?: string
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
  roleLabel: string
  status: string
  subjectName: string
  subjectId?: string
  classLabels: string[]
  employeeCode: string
  photoUrl?: string | null
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operations Manager",
  accountant: "Accountant",
  teacher: "Teacher",
  parent: "Parent",
}

export function staffRoleLabel(role: Role) {
  return ROLE_LABELS[role] ?? role
}

function isStaffRole(role: string): role is Role {
  return STAFF_ROLES.has(role as Role)
}

export function buildStaffDirectory(
  users: ApiUser[],
  teachers: ApiTeacher[]
): StaffDirectoryRow[] {
  const teacherByUserId = new Map<number, ApiTeacher>()
  for (const teacher of teachers) {
    if (teacher.fkUserId) teacherByUserId.set(teacher.fkUserId, teacher)
  }

  const rows: StaffDirectoryRow[] = []
  for (const user of users) {
    if (!isStaffRole(user.role)) continue
    if (user.role === "super_admin") continue
    const role = user.role
    const teacher = teacherByUserId.get(user.id)
    const classLabels: string[] = []
    if (teacher?.classes) {
      for (const klass of teacher.classes) {
        classLabels.push(klass.label || `${klass.grade} · ${klass.section}`)
      }
    }
    rows.push({
      id: String(user.id),
      teacherId: teacher ? String(teacher.id) : undefined,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone?.trim() || "—",
      role,
      roleLabel: staffRoleLabel(role),
      status: user.status,
      subjectName: teacher?.subject?.name ?? "—",
      subjectId: teacher?.subject?.id != null ? String(teacher.subject.id) : undefined,
      classLabels,
      employeeCode: teacher?.employeeCode?.trim() || "—",
      photoUrl: user.photoUrl ?? resolveStorageUrl(user.photo),
    })
  }

  rows.sort((a, b) => a.name.localeCompare(b.name))
  return rows
}

export function creatableStaffRoles(actorRole: Role): Role[] {
  if (actorRole === "super_admin") {
    return ["teacher", "operations_manager", "accountant"]
  }
  return ["teacher"]
}
