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

/** Maps wizard/store input to API body; only includes keys present on `input` (safe for PATCH). */
export function toApplicationApiBody(
  input: Partial<ApplicationInput> & {
    decision?: Application["decision"]
    classId?: string
  }
): UpsertApplicationBody {
  const body: UpsertApplicationBody = {}

  if (input.name !== undefined) body.name = input.name

  if (input.classId !== undefined) {
    const rawClassId = Number(input.classId)
    if (Number.isFinite(rawClassId) && rawClassId > 0) {
      body.fkClassId = rawClassId
    }
  }

  if (input.guardian !== undefined) body.guardian = input.guardian
  if (input.phone !== undefined) body.phone = input.phone
  if (input.email !== undefined) {
    body.email = input.email?.trim() ? input.email.trim() : undefined
  }
  if (input.dob !== undefined) body.dob = input.dob || undefined
  if (input.gender !== undefined) body.gender = input.gender
  if (input.address !== undefined) body.address = input.address
  if (input.previousSchool !== undefined) {
    body.previousSchool = input.previousSchool
  }
  if (input.previousClass !== undefined) body.previousClass = input.previousClass
  if (input.guardianRelation !== undefined) {
    body.guardianRelation = input.guardianRelation
  }
  if (input.guardianAddress !== undefined) {
    body.guardianAddress = input.guardianAddress
  }

  if (input.interviewType !== undefined) {
    body.interviewType = input.interviewType || undefined
  }
  if (input.interviewDate !== undefined) {
    body.interviewDate =
      input.interviewDate && String(input.interviewDate).trim()
        ? input.interviewDate
        : null
  }
  if (input.interviewScore !== undefined) {
    body.interviewScore = input.interviewScore || undefined
  }
  if (input.interviewResult !== undefined) {
    body.interviewResult = input.interviewResult || undefined
  }
  if (input.decision !== undefined) body.decision = input.decision || undefined
  if (input.notes !== undefined) body.notes = input.notes

  if (input.documents !== undefined) {
    body.documents = input.documents.map(
      (doc: Application["documents"][number]) => ({
        id: Number(doc.id) > 0 ? Number(doc.id) : undefined,
        label: doc.label,
        status: doc.status,
        fileUrl: doc.fileUrl ?? undefined,
      })
    )
  }

  return body
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
