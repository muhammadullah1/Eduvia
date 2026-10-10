import type { MarkSheet, SchoolState } from "@/data/types"
import { resultVisibility } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { outstanding } from "@/lib/fees"

/** Parent visibility for one sheet, evaluated now against the fee rule and overrides (UR-07). */
export function visibilityFor(
  state: SchoolState,
  sheet: MarkSheet,
  studentId: string
) {
  return resultVisibility(sheet, studentId, {
    feeMonths: state.feeMonths,
    overrides: state.resultOverrides,
    rule: state.settings.resultVisibility.feeRule,
    today: getToday(),
  })
}

export function unpaidMonths(state: SchoolState, studentId: string) {
  const currentMonth = getToday().slice(0, 7)
  return state.feeMonths
    .filter(
      (month) =>
        month.studentId === studentId &&
        month.month <= currentMonth &&
        outstanding(month) > 0
    )
    .sort((a, b) => a.month.localeCompare(b.month))
}
