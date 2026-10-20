import type { Student, StudentStatus } from "@/data/types"
import type { ApiStudent, ApiStudentParent } from "@/lib/api-types"

/** The primary guardian, falling back to the first linked parent. */
export function primaryGuardian(dto: ApiStudent): { name: string; phone: string } {
  const parents = dto.parents ?? []
  const parent: ApiStudentParent | undefined =
    parents.find((item) => item.student_parents?.isPrimary) ?? parents[0]
  if (!parent) return { name: "", phone: "" }
  const userName = parent.user ? `${parent.user.firstName} ${parent.user.lastName}`.trim() : ""
  return {
    name: parent.guardianName || userName || parent.fatherName || parent.motherName || "",
    phone: parent.primaryContactNumber || parent.user?.phone || "",
  }
}

export function mapStudentDto(dto: ApiStudent): Student {
  const guardian = primaryGuardian(dto)
  const status: StudentStatus =
    dto.status === "Withdrawn" ? "Withdrawn" : "Active"
  return {
    id: String(dto.id),
    admissionNo: dto.admissionNo,
    name: `${dto.firstName} ${dto.lastName}`.trim(),
    classId: String(dto.fkClassId || dto.class?.id || ""),
    guardian: guardian.name,
    phone: guardian.phone,
    status,
    dob: String(
      (dto as { dateOfBirth?: string }).dateOfBirth || dto.dob || ""
    ).slice(0, 10),
    gender: dto.gender === "Female" ? "Female" : "Male",
    admittedOn: String(
      (dto as { admissionDate?: string }).admissionDate ||
        dto.admittedOn ||
        ""
    ).slice(0, 10),
  }
}
