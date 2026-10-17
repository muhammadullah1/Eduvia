import type { AbsenceStatus, Substitution, TeacherAbsence } from "@/data/types"
import type { ApiAbsence } from "@/lib/api-types"
import { getToday } from "@/lib/dates"

type CoverSlot = {
  periodIndex?: number
  fkClassId?: number
  subject?: { name?: string }
}

type Cover = NonNullable<ApiAbsence["substitution"]> & {
  periodIndex?: number
  slot?: CoverSlot
  substituteTeacher?: NonNullable<
    ApiAbsence["substitution"]
  >["substituteTeacher"] & { id?: number }
}

export type AbsenceRow = ApiAbsence & {
  reason?: string
  markedBy?: string
  teacher?: ApiAbsence["teacher"] & { id?: number }
  substitutions?: Cover[]
}

function coversFor(row: AbsenceRow) {
  return [
    ...(row.substitution ? [row.substitution as Cover] : []),
    ...(row.substitutions ?? []),
  ]
}

export function mapTeacherAbsencesFromApi(
  rows: AbsenceRow[],
  today = getToday()
): { teacherAbsences: TeacherAbsence[]; substitutions: Substitution[] } {
  const teacherAbsences: TeacherAbsence[] = rows.map((a) => {
    const cover = coversFor(a)[0]
    const slot = cover?.slot
    const rawStatus = String(a.status ?? "Pending")
    let status: AbsenceStatus = rawStatus as AbsenceStatus
    if (rawStatus === "Cancelled") status = "Cancelled"
    else if (cover) status = "Covered"
    else if (rawStatus === "Approved") status = "Pending"

    return {
      id: String(a.id),
      teacherId: String(a.fkTeacherId ?? a.teacher?.id ?? ""),
      date: a.date ? a.date.slice(0, 10) : today,
      periodIndex:
        Number(a.periodIndex || slot?.periodIndex || cover?.periodIndex) || 1,
      classId: a.fkClassId
        ? String(a.fkClassId)
        : slot?.fkClassId
          ? String(slot.fkClassId)
          : undefined,
      subject: a.subject?.name ?? slot?.subject?.name,
      status,
      markedBy: a.markedBy ?? "",
      notes: a.notes ?? a.reason ?? "",
    }
  })

  const substitutions: Substitution[] = rows.flatMap((a) => {
    if (String(a.status ?? "") === "Cancelled") return []
    return coversFor(a).map((sub) => {
      const slot = sub.slot
      return {
        id: String(sub.id),
        absenceId: String(a.id),
        date: a.date ? a.date.slice(0, 10) : today,
        periodIndex: Number(sub.periodIndex || slot?.periodIndex) || 1,
        classId: String(a.fkClassId ?? slot?.fkClassId ?? ""),
        subject: a.subject?.name ?? slot?.subject?.name ?? "",
        originalTeacherId: String(a.fkTeacherId ?? a.teacher?.id ?? ""),
        substituteTeacherId: String(
          sub.fkSubstituteTeacherId ?? sub.substituteTeacher?.id ?? ""
        ),
        authorizedBy:
          typeof sub.authorizedBy === "string" ? sub.authorizedBy : "",
        at: sub.createdAt ?? new Date().toISOString(),
      }
    })
  })

  return { teacherAbsences, substitutions }
}
