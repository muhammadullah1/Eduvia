import type { GradeBand } from "@/data/types"

/** A failed paper always shows this grade; the API rejects it as a band name. */
export const FAIL_GRADE = "F"
export const MIN_BANDS = 2
export const MAX_BANDS = 12
export const MAX_GRADE_LENGTH = 3
const FULL_MARKS = 100

export function sortedBands(bands: GradeBand[]) {
  return [...bands].sort((a, b) => b.min - a.min)
}

/** Mirrors exam.service gradeFor: highest band whose minimum the percent meets. */
export function gradeForPercent(percent: number, passed: boolean, bands: GradeBand[]) {
  if (!passed) return FAIL_GRADE
  const ordered = sortedBands(bands)
  const band = ordered.find((item) => percent >= item.min)
  if (band) return band.grade
  return ordered.at(-1)?.grade ?? FAIL_GRADE
}

/** Same rules as the API's grading validation; null when the scale is valid. */
export function gradingError(bands: GradeBand[]): string | null {
  if (bands.length < MIN_BANDS || bands.length > MAX_BANDS)
    return `Use between ${MIN_BANDS} and ${MAX_BANDS} grade bands.`
  const grades = new Set<string>()
  const mins = new Set<number>()
  for (const band of bands) {
    const grade = band.grade.trim()
    if (!grade || grade.length > MAX_GRADE_LENGTH)
      return `Each grade needs 1 to ${MAX_GRADE_LENGTH} characters.`
    if (grade.toUpperCase() === FAIL_GRADE)
      return `"${FAIL_GRADE}" is reserved for failed papers.`
    if (!Number.isInteger(band.min) || band.min < 0 || band.min > FULL_MARKS)
      return "Minimum percentages must be whole numbers from 0 to 100."
    if (grades.has(grade.toUpperCase())) return `Grade "${grade}" is used twice.`
    if (mins.has(band.min)) return `Two bands start at ${band.min}%.`
    grades.add(grade.toUpperCase())
    mins.add(band.min)
  }
  if (!mins.has(0)) return "One band must start at 0% so every score gets a grade."
  return null
}

/** Matches the API limit on Settings → Receipt template footer. */
export const RECEIPT_FOOTER_MAX = 300
