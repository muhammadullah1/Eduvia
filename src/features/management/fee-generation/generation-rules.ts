import type { StatusChipTone } from "@/components/app/status-chip"

export const GENERATION_STEPS = ["Select Month", "Preview", "Confirm", "Generated"] as const
export type GenerationStep = 1 | 2 | 3 | 4

/** `yyyy-MM` for the month containing `today`. */
export function currentMonthKey(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
}

/** "Oct 2026" for `2026-10`. */
export function monthTitle(key: string) {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" })
}

export function formatPkr(amount: number | undefined) {
  if (amount === undefined) return "—"
  return amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-PK")} ${n === 1 ? one : many}`

/** Status chip tone for a ledger month or bill status. */
export function statusTone(status: string): StatusChipTone {
  if (status === "Paid") return "success"
  if (status === "Advance") return "brand"
  if (status === "Partially Paid") return "warning"
  if (status === "Unpaid") return "danger"
  return "neutral"
}

/** Separately billed fees included in a result, e.g. "Annual ×3, Exam ×12". */
export function extrasSummary(byType: Partial<Record<string, { bills: number }>>) {
  return Object.entries(byType)
    .filter(([type, v]) => type !== "Tuition" && v && v.bills > 0)
    .map(([type, v]) => `${type} ×${v?.bills ?? 0}`)
    .join(", ")
}
