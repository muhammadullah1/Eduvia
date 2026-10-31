import type {
  FeeMonth,
  MarkSheet,
  ResultFeeRule,
  ResultOverride,
  Staff,
  Substitution,
  TeacherAbsence,
  TimetableSlot,
} from "@/data/types"
import { isMonthPaid, isPaidThrough } from "@/lib/fees"

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export function weekdayOf(isoDay: string) {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  })
}

export function weekOfMonth(isoDay: string) {
  return Math.ceil(Number(isoDay.slice(8, 10)) / 7)
}

// ---- substitutes (UR-03 / §5) ----------------------------------------------

/** Timetable slots a teacher covers on `date`, including substitute duties. */
export function teacherDuties(
  teacherId: string,
  date: string,
  slots: TimetableSlot[],
  substitutions: Substitution[]
) {
  const weekday = weekdayOf(date)
  const own = slots
    .filter((slot) => slot.teacherId === teacherId && slot.day === weekday)
    .map((slot) => ({
      periodIndex: slot.periodIndex,
      classId: slot.classId,
      subject: slot.subject,
      substitute: false as const,
    }))
  const covering = substitutions
    .filter((row) => row.substituteTeacherId === teacherId && row.date === date)
    .map((row) => ({
      periodIndex: row.periodIndex,
      classId: row.classId,
      subject: row.subject,
      substitute: true as const,
    }))
  return [...own, ...covering].sort((a, b) => a.periodIndex - b.periodIndex)
}

/** Why a teacher cannot cover `date` + `periodIndex`, or null when they are free. */
export function busyReason(
  teacherId: string,
  date: string,
  periodIndex: number,
  slots: TimetableSlot[],
  substitutions: Substitution[],
  absences: TeacherAbsence[]
) {
  const weekday = weekdayOf(date)
  if (
    absences.some(
      (row) =>
        row.teacherId === teacherId &&
        row.date === date &&
        row.periodIndex === periodIndex &&
        row.status !== "Cancelled"
    )
  )
    return "is absent in that period"
  if (
    slots.some(
      (slot) =>
        slot.teacherId === teacherId &&
        slot.day === weekday &&
        slot.periodIndex === periodIndex
    )
  )
    return "already teaches a class in that period"
  if (
    substitutions.some(
      (row) =>
        row.substituteTeacherId === teacherId &&
        row.date === date &&
        row.periodIndex === periodIndex
    )
  )
    return "is already substituting in that period"
  return null
}

export function availableSubstitutes(
  absence: TeacherAbsence,
  staff: Staff[],
  slots: TimetableSlot[],
  substitutions: Substitution[],
  absences: TeacherAbsence[]
) {
  const others = substitutions.filter((row) => row.absenceId !== absence.id)
  return staff.filter(
    (person) =>
      person.role === "Teacher" &&
      person.id !== absence.teacherId &&
      !busyReason(
        person.id,
        absence.date,
        absence.periodIndex,
        slots,
        others,
        absences
      )
  )
}

// ---- result visibility (UR-07 / §8) ----------------------------------------

export function activeOverride(
  overrides: ResultOverride[],
  examId: string,
  studentId: string
) {
  return overrides.find(
    (row) =>
      row.examId === examId && row.studentId === studentId && !row.revokedAt
  )
}

export function feeCleared(
  feeMonths: FeeMonth[],
  studentId: string,
  month: string | undefined,
  rule: ResultFeeRule,
  today: string
) {
  if (rule === "disabled") return true
  const target = month ?? today.slice(0, 7)
  const own = feeMonths.filter((row) => row.studentId === studentId)
  return rule === "exam_month_paid"
    ? isMonthPaid(own, target)
    : isPaidThrough(own, target)
}

/**
 * Parent visibility is evaluated at view time: published AND (fee rule met OR
 * active override). It never changes the stored result.
 */
export function resultVisibility(
  sheet: MarkSheet,
  studentId: string,
  context: {
    feeMonths: FeeMonth[]
    overrides: ResultOverride[]
    rule: ResultFeeRule
    today: string
  }
) {
  const published = sheet.status === "Published"
  const cleared = feeCleared(
    context.feeMonths,
    studentId,
    sheet.feeMonth,
    context.rule,
    context.today
  )
  const override = activeOverride(context.overrides, sheet.examId, studentId)
  return {
    published,
    feeCleared: cleared,
    override,
    visible: published && (cleared || Boolean(override)),
  }
}
