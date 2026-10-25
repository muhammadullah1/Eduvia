import type { FeeFrequency } from "@/api/fees/fee-structure.service"

export const FREQUENCY_LABEL: Record<FeeFrequency, string> = {
  Monthly: "Every month",
  OneTime: "Once, at admission",
  Yearly: "Once a year",
}

export function formatAmount(amount: number) {
  return amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })
}

/** First day of next month: the earliest date a change reaches a generated fee month. */
export function nextMonthStart(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

/** Returns an error message, or null when the amount is a positive PKR value with up to 2 decimals. */
export function amountError(raw: string) {
  const text = raw.trim()
  if (!text) return "Enter an amount."
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return "Use a number with at most 2 decimal places."
  const value = Number(text)
  if (value <= 0) return "Amount must be greater than 0."
  if (value > 9_999_999_999.99) return "Amount is too large."
  return null
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong. Try again.")
