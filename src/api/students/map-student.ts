import type { ApiStudent } from "@/lib/api-types"
import type { Student, StudentStatus } from "@/data/types"

export function mapStudentDto(dto: ApiStudent): Student {
  const status: StudentStatus =
    dto.status === "Withdrawn" ? "Withdrawn" : "Active"
  return {
    id: String(dto.id),
    admissionNo: dto.admissionNo,
    name: `${dto.firstName} ${dto.lastName}`.trim(),
    classId: String(dto.fkClassId || dto.class?.id || ""),
    guardian: dto.lastName,
    phone: "",
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
