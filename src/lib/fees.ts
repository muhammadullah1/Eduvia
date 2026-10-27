import type { FeeMonth, FeeMonthStatus } from "@/data/types"

/** Month keys are `YYYY-MM`. */
export function monthKey(isoDay: string) {
  return isoDay.slice(0, 7)
}

export function addMonths(month: string, count: number) {
  const [year, value] = month.split("-").map(Number)
  const index = year * 12 + (value - 1) + count
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
}

export function monthRange(from: string, to: string) {
  const months: string[] = []
  for (let month = from; month <= to; month = addMonths(month, 1))
    months.push(month)
  return months
}

export function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number)
  return new Date(Date.UTC(year, value - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function outstanding(month: Pick<FeeMonth, "amountDue" | "amountPaid">) {
  return Math.max(0, month.amountDue - month.amountPaid)
}

/** Same rule as the API: Unpaid / Partially Paid / Paid, or Advance for a future month paid up front. */
export function feeMonthStatus(
  month: Pick<FeeMonth, "amountDue" | "amountPaid" | "month">,
  currentMonth: string
): FeeMonthStatus {
  if (month.amountPaid <= 0) return "Unpaid"
  if (month.amountPaid < month.amountDue) return "Partially Paid"
  return month.month > currentMonth ? "Advance" : "Paid"
}

export type AllocationLine = {
  feeMonthId: string
  month: string
  amount: number
}

/**
 * Oldest-unpaid-first allocation (UR-09 / BR-12). Deterministic: months are
 * ordered by month, and each one is cleared before the next is touched.
 */
export function planOldestFirst(months: FeeMonth[], amount: number) {
  let remaining = Math.round(amount)
  const lines: AllocationLine[] = []
  for (const month of [...months].sort((a, b) =>
    a.month.localeCompare(b.month)
  )) {
    if (remaining <= 0) break
    const open = outstanding(month)
    if (open <= 0) continue
    const take = Math.min(open, remaining)
    lines.push({ feeMonthId: month.id, month: month.month, amount: take })
    remaining -= take
  }
  return { lines, leftover: remaining }
}

/** Explicit allocation by an authorized user: known months, within balance, within the payment. */
export function validateManualPlan(
  months: FeeMonth[],
  amount: number,
  requested: { feeMonthId: string; amount: number }[]
) {
  const byId = new Map(months.map((month) => [month.id, month]))
  let total = 0
  const lines: AllocationLine[] = []
  for (const line of requested) {
    const month = byId.get(line.feeMonthId)
    if (!month)
      return {
        error:
          "An allocation targets a month that does not belong to this student.",
      }
    if (line.amount <= 0)
      return { error: "Allocation amounts must be positive." }
    if (line.amount > outstanding(month))
      return {
        error: `Allocation exceeds the balance of ${monthLabel(month.month)}.`,
      }
    total += line.amount
    lines.push({
      feeMonthId: month.id,
      month: month.month,
      amount: line.amount,
    })
  }
  if (total > amount) return { error: "Allocations exceed the payment amount." }
  return { lines, leftover: amount - total }
}

/** True when every month up to and including `month` is fully paid. */
export function isPaidThrough(months: FeeMonth[], month: string) {
  return months
    .filter((item) => item.month <= month)
    .every((item) => outstanding(item) === 0)
}

export function isMonthPaid(months: FeeMonth[], month: string) {
  const row = months.find((item) => item.month === month)
  return Boolean(row) && outstanding(row as FeeMonth) === 0
}

/**
 * Applies a payment to one student's ledger: oldest unpaid month first, up to the
 * months already billed. Money beyond what is owed is returned as `leftover` and
 * becomes student credit; future months are never created or pre-paid here
 * (same rule as the server allocator used by counter payments and offline sync).
 */
export function allocateOldestFirst(
  ledger: FeeMonth[],
  input: {
    studentId: string
    amount: number
    /** Kept for callers; no longer used because future months are not billed here. */
    monthlyFee?: number
    currentMonth: string
    newId?: (month: string) => string
  }
) {
  const months = [...ledger].sort((a, b) => a.month.localeCompare(b.month))
  const plan = planOldestFirst(months, input.amount)
  return {
    months: applyLines(months, plan.lines),
    lines: plan.lines,
    leftover: plan.leftover,
  }
}

export function applyLines(months: FeeMonth[], lines: AllocationLine[]) {
  return months.map((month) => {
    const paid = lines
      .filter((line) => line.feeMonthId === month.id)
      .reduce((sum, line) => sum + line.amount, 0)
    return paid ? { ...month, amountPaid: month.amountPaid + paid } : month
  })
}
