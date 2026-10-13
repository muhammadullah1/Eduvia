import { classDisplayName } from "@/api/classes/map-class"
import type { SubjectRow } from "@/api/subjects/map-subject"
import type { ClassSection, TimetableSlot } from "@/data/types"

import type { SubjectTableRow } from "./subjects-data-table"

export function classLabelsForSubject(
  subjectName: string,
  slots: TimetableSlot[],
  classes: ClassSection[]
): string[] {
  const classIds = new Set(
    slots
      .filter(
        (slot) =>
          slot.subject &&
          slot.subject.toLowerCase() === subjectName.toLowerCase()
      )
      .map((slot) => slot.classId)
  )
  const byId = new Map(classes.map((c) => [c.id, c]))
  const labels: string[] = []
  for (const id of classIds) {
    const klass = byId.get(id)
    if (klass) labels.push(classDisplayName(klass))
  }
  return labels.sort((a, b) => a.localeCompare(b))
}

export function toSubjectTableRows(
  subjects: SubjectRow[],
  slots: TimetableSlot[],
  classes: ClassSection[]
): SubjectTableRow[] {
  return subjects.map((subject) => ({
    ...subject,
    classLabels: classLabelsForSubject(subject.name, slots, classes),
  }))
}
