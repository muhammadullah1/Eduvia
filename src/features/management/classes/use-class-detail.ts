import { useMemo } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import type { ClassSection, SchoolState, Student } from "@/data/types"
import { getToday } from "@/lib/dates"

export function studentsForClass(state: SchoolState, classId: string) {
  return state.students.filter(
    (student) => student.classId === classId && student.status !== "Withdrawn"
  )
}

export type StudentFeeUiStatus = "paid" | "overdue" | "partial" | "due" | "none"

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
  // Not yet past the due date: "Partial" only once something has been paid.
  return unpaid.some((row) => row.amountPaid > 0) ? "partial" : "due"
}

export function studentIsActive(student: Student) {
  return student.status === "Active"
}

/** Legacy helper for list-page counts when portal store is synced. */
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

  const displayName = klass ? classDisplayName(klass) : "Class"

  const metaLine = session
    ? `Session ${session.name} · ${students.length} student${students.length === 1 ? "" : "s"}`
    : `${students.length} students`

  return {
    session,
    students,
    displayName,
    metaLine,
    studentCount: students.length,
  }
}
