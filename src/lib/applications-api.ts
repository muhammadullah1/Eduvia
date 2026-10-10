import type { Application, ApplicationInput } from "@/data/types"

import applicationsService from "@/api/admissions/applications.service"
import type { UpsertApplicationBody } from "@/types/admissions/api/request"

export function applicationNumericId(id: string) {
  const n = Number(String(id).replace(/^APP-/, ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function applicationIdFromApi(id: number) {
  return `APP-${id}`
}

export function toApplicationApiBody(
  input: Partial<ApplicationInput> & {
    decision?: Application["decision"]
    classId?: string
  }
): UpsertApplicationBody {
  const rawClassId = Number(input.classId)
  const fkClassId =
    Number.isFinite(rawClassId) && rawClassId > 0 ? rawClassId : undefined

  const interviewDate =
    input.interviewDate && String(input.interviewDate).trim()
      ? input.interviewDate
      : null

  return {
    name: input.name,
    fkClassId,
    guardian: input.guardian,
    phone: input.phone,
    email: (input as { email?: string }).email || undefined,
    dob: input.dob || undefined,
    gender: input.gender,
    address: input.address,
    previousSchool: input.previousSchool,
    previousClass: input.previousClass,
    guardianRelation: input.guardianRelation,
    guardianAddress: input.guardianAddress,
    interviewType: input.interviewType || undefined,
    interviewDate,
    interviewScore: input.interviewScore || undefined,
    interviewResult: input.interviewResult || undefined,
    decision: input.decision || undefined,
    notes: input.notes || undefined,
    documents: input.documents?.map((doc) => ({
      id: Number(doc.id) > 0 ? Number(doc.id) : undefined,
      label: doc.label,
      status: doc.status,
    })),
  }
}

export async function createApplicationDraft(
  body: ReturnType<typeof toApplicationApiBody>
) {
  const data = await applicationsService.createDraft(body)
  return applicationIdFromApi(data.id)
}

export async function patchApplication(
  id: string,
  body: ReturnType<typeof toApplicationApiBody>
) {
  const numId = applicationNumericId(id)
  if (!numId) throw new Error("Invalid application id")
  await applicationsService.update(numId, body)
}

export async function submitApplication(id: string) {
  const numId = applicationNumericId(id)
  if (!numId) throw new Error("Invalid application id")
  await applicationsService.submit(numId)
}

export async function reviewApplication(id: string) {
  const numId = applicationNumericId(id)
  if (!numId) throw new Error("Invalid application id")
  await applicationsService.review(numId)
}

export async function decideApplication(
  id: string,
  decision: "Admit" | "Reject" | "Waitlist",
  remarks?: string
) {
  const numId = applicationNumericId(id)
  if (!numId) throw new Error("Invalid application id")
  await applicationsService.decide(numId, { decision, remarks })
}

export async function enrollApplication(id: string) {
  const numId = applicationNumericId(id)
  if (!numId) throw new Error("Invalid application id")
  await applicationsService.enroll(numId)
}
