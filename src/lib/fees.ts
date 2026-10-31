import type { FeeMonth, FeeMonthStatus } from "@/data/types"

export function addMonths(month: string, count: number) {
  const [year, value] = month.split("-").map(Number)
  const index = year * 12 + (value - 1) + count
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`
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
