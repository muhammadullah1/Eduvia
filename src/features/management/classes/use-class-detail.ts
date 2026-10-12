import { useMemo } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import type { ClassSection, SchoolState, Student } from "@/data/types"
import { getToday } from "@/lib/dates"

export type ClassSubjectRow = {
  id: string
  name: string
  code: string
}

export function subjectsForClass(state: SchoolState, classId: string) {
  const names = new Set(
    state.slots
      .filter((slot) => slot.classId === classId)
      .map((slot) => slot.subject)
      .filter(Boolean)
  )
  const rows: ClassSubjectRow[] = []
  for (const name of names) {
    const catalog = state.subjects.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    )
    rows.push({
      id: catalog?.id ?? name,
      name,
      code: catalog?.code ?? name.slice(0, 3).toUpperCase(),
    })
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function studentsForClass(state: SchoolState, classId: string) {
  return state.students.filter(
    (student) => student.classId === classId && student.status !== "Withdrawn"
  )
}

export type StudentFeeUiStatus = "paid" | "overdue" | "partial" | "none"

export function studentFeeStatus(
  studentId: string,
  feeMonths: SchoolState["feeMonths"]
): StudentFeeUiStatus {
  const rows = feeMonths.filter((row) => row.studentId === studentId)
  if (rows.length === 0) return "none"
  const today = getToday()
  const unpaid = rows.filter((row) => row.amountPaid < row.amountDue)
  if (unpaid.length === 0) return "paid"
  const overdue = unpaid.some((row) => row.dueDate && row.dueDate < today)
  if (overdue) return "overdue"
  return "partial"
}

export function studentIsActive(student: Student) {
  return student.status === "Active"
}

export function useClassDetail(
  state: SchoolState,
  classId: string,
  klass: ClassSection | undefined
) {
  const session = useMemo(
    () => state.sessions.find((item) => item.current),
    [state.sessions]
  )

  const students = useMemo(
    () => studentsForClass(state, classId),
    [state, classId]
  )

  const subjects = useMemo(
    () => subjectsForClass(state, classId),
    [state, classId]
  )

  const displayName = klass ? classDisplayName(klass) : "Class"

  const metaLine = session
    ? `Session ${session.name} · ${students.length} student${students.length === 1 ? "" : "s"} · ${subjects.length} subject${subjects.length === 1 ? "" : "s"}`
    : `${students.length} students · ${subjects.length} subjects`

  return {
    session,
    students,
    subjects,
    displayName,
    metaLine,
    studentCount: students.length,
    subjectCount: subjects.length,
  }
}
