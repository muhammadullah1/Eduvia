import type { Application } from "@/data/types"
import { normalizeApplicationStatus } from "@/data/types"
import type { ApplicationDto } from "@/types/admissions/api/response"

export function mapApplicationDto(dto: ApplicationDto): Application {
  return {
    id: `APP-${dto.id}`,
    name: dto.name,
    classId: dto.fkClassId ? String(dto.fkClassId) : "",
    classDisplay: dto.gradeApplyingFor || undefined,
    guardian: dto.guardian ?? "",
    phone: dto.phone ?? "",
    dob: dto.dob ? String(dto.dob).slice(0, 10) : "",
    gender: dto.gender === "Male" ? "Male" : "Female",
    address: dto.address ?? "",
    previousSchool: dto.previousSchool ?? "",
    previousClass: dto.previousClass ?? "",
    guardianRelation: dto.guardianRelation ?? "Guardian",
    guardianAddress: dto.guardianAddress ?? "",
    documents: (dto.documents ?? []).map((doc) => ({
      id: String(doc.id),
      label: doc.label,
      status: (doc.status ?? "Pending") as Application["documents"][number]["status"],
    })),
    interviewType: dto.interviewType ?? "",
    interviewDate: dto.interviewDate ? String(dto.interviewDate).slice(0, 10) : "",
    interviewScore: dto.interviewScore ?? "",
    interviewResult: dto.interviewResult ?? "",
    decision: (dto.decision as Application["decision"]) ?? "",
    status: normalizeApplicationStatus(dto.status),
    submittedOn: dto.submittedOn ? String(dto.submittedOn).slice(0, 10) : "",
    notes: dto.notes ?? "",
  }
}
