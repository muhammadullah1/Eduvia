import type {
  DailyTestRules,
  FeeMonth,
  MarkSheet,
  MonthlyOutcome,
  ResultFeeRule,
  ResultOverride,
  Staff,
  Substitution,
  TeacherAbsence,
  TimetableSlot,
  WeeklyTest,
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

/** Every date in `month` (YYYY-MM) that falls on `weekday`. */
export function datesOnWeekday(month: string, weekday: string) {
  const [year, value] = month.split("-").map(Number)
  const days = new Date(Date.UTC(year, value, 0)).getUTCDate()
  const dates: string[] = []
  for (let day = 1; day <= days; day += 1) {
    const iso = `${month}-${String(day).padStart(2, "0")}`
    if (weekdayOf(iso) === weekday) dates.push(iso)
  }
  return dates
}

// ---- weekly tests (UR-05 / UR-06 / BR-08) ----------------------------------

export type MonthSummary = {
  testsScheduled: number
  testsTaken: number
  passedCount: number
  failedCount: number
  averagePercent: number | null
  status: MonthlyOutcome
  flaggedForFollowUp: boolean
}

/** Mirrors the API's `summarizeMonth`, using the school's configurable rules. */
export function summarizeMonth(
  marks: { score: number | null; max: number }[],
  testsScheduled: number,
  rules: DailyTestRules
): MonthSummary {
  const percents = marks
    .filter((mark) => mark.score !== null && mark.max > 0)
    .map((mark) => ((mark.score as number) / mark.max) * 100)
  const passedCount = percents.filter(
    (percent) => percent >= rules.passPercent
  ).length
  const failedCount = percents.length - passedCount
  const averagePercent = percents.length
    ? Math.round(
        (percents.reduce((sum, p) => sum + p, 0) / percents.length) * 100
      ) / 100
    : null

  let status: MonthlyOutcome = "Passed"
  if (failedCount > rules.maxFailsPerMonth) status = "Failed"
  else if (
    rules.lowMarksEnabled &&
    passedCount >= rules.lowMarksMinPassed &&
    (averagePercent ?? 0) < rules.lowMarksBelowPercent
  )
    status = "LowMarks"
  else if (percents.length === 0 || percents.length < testsScheduled)
    status = "InProgress"

  return {
    testsScheduled,
    testsTaken: percents.length,
    passedCount,
    failedCount,
    averagePercent,
    status,
    flaggedForFollowUp: status === "Failed",
  }
}

export type SubjectMonthRow = MonthSummary & {
  studentId: string
  classId: string
  subject: string
  month: string
  tests: WeeklyTest[]
}

/**
 * Monthly subject summaries for a class. `publishedOnly` gives the parent view:
 * unpublished marks never reach families (UR-05).
 */
export function monthlySummaries(
  tests: WeeklyTest[],
  month: string,
  rules: DailyTestRules,
  options: {
    classId?: string
    studentIds?: string[]
    publishedOnly?: boolean
  } = {}
) {
  const inMonth = tests.filter(
    (test) =>
      test.month === month &&
      (!options.classId || test.classId === options.classId)
  )
  const groups = new Map<string, WeeklyTest[]>()
  for (const test of inMonth) {
    const key = `${test.classId}|${test.subject}`
    groups.set(key, [...(groups.get(key) ?? []), test])
  }
  const rows: SubjectMonthRow[] = []
  for (const [key, group] of groups) {
    const [classId, subject] = key.split("|")
    const counted = options.publishedOnly
      ? group.filter((test) => test.status === "Published")
      : group.filter((test) => test.status !== "Scheduled")
    const students = new Set(
      group.flatMap((test) => test.results.map((result) => result.studentId))
    )
    for (const studentId of students) {
      if (options.studentIds && !options.studentIds.includes(studentId))
        continue
      const marks = counted.map((test) => ({
        score:
          test.results.find((result) => result.studentId === studentId)
            ?.score ?? null,
        max: test.max,
      }))
      rows.push({
        ...summarizeMonth(marks, group.length, rules),
        studentId,
        classId,
        subject,
        month,
        tests: [...group].sort((a, b) => a.date.localeCompare(b.date)),
      })
    }
  }
  return rows
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
