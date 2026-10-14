import { addMonths, format, startOfDay, subYears } from "date-fns"

/** Student DOB: roughly 3–25 years old for K–12 admissions. */
export function studentDobBounds() {
  const today = startOfDay(new Date())
  return {
    fromDate: format(subYears(today, 25), "yyyy-MM-dd"),
    toDate: format(today, "yyyy-MM-dd"),
  }
}

/** Scheduled interview / test: from today through 18 months ahead (no past dates). */
export function interviewDateBounds() {
  const today = startOfDay(new Date())
  return {
    fromDate: format(today, "yyyy-MM-dd"),
    toDate: format(addMonths(today, 18), "yyyy-MM-dd"),
  }
}

export function enrollmentDateBounds() {
  const today = startOfDay(new Date())
  const from = subYears(today, 1)
  return {
    fromDate: format(from, "yyyy-MM-dd"),
    toDate: format(addMonths(today, 3), "yyyy-MM-dd"),
  }
}

export function isIsoDateInRange(
  iso: string,
  fromDate: string,
  toDate: string
) {
  if (!iso) return false
  const d = iso.slice(0, 10)
  return d >= fromDate && d <= toDate
}
