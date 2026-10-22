/** Paper totals: whole numbers in this range (mirrors the API). */
export const PAPER_TOTAL_MIN = 1
export const PAPER_TOTAL_MAX = 1000

/** Exam text limits (mirrors the API). */
export const EXAM_NAME_MIN = 3
export const EXAM_NAME_MAX = 100

/**
 * Keep only what a marks box may hold: digits and, when allowed, one decimal
 * point with up to two places. Letters, signs and exponents are dropped.
 */
export function marksInput(value: string, { decimals = true }: { decimals?: boolean } = {}) {
  const cleaned = value.replace(decimals ? /[^\d.]/g : /\D/g, "")
  if (!decimals) return cleaned
  const [whole, ...rest] = cleaned.split(".")
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole
}

/** Problem with a paper total, or null when it is valid. */
export function paperTotalError(raw: string) {
  if (raw.trim() === "") return "Enter the paper's total marks."
  const total = Number(raw)
  if (!Number.isInteger(total)) return "Total marks must be a whole number."
  if (total < PAPER_TOTAL_MIN || total > PAPER_TOTAL_MAX) {
    return `Total marks must be between ${PAPER_TOTAL_MIN} and ${PAPER_TOTAL_MAX}.`
  }
  return null
}
