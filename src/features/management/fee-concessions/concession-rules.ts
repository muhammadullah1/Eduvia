import type { ConcessionMode, ConcessionStatus, FeeConcession } from "@/api/fees/concessions.service"
import type { StatusChipTone } from "@/components/app/status-chip"
import { ApiHttpError } from "@/lib/api"

export const MODE_LABEL: Record<ConcessionMode, string> = {
  fixed_payable: "Fixed amount payable",
  fixed_discount: "Fixed amount off",
  percent: "Percentage",
  waiver: "Full waiver",
}

export const STATUS_TONE: Record<ConcessionStatus, StatusChipTone> = {
  Draft: "neutral",
  PendingApproval: "warning",
  Approved: "success",
  Rejected: "danger",
  Revoked: "danger",
  Superseded: "neutral",
}

/** Safe for API nulls (e.g. Tuition not configured → base is null). */
export function formatAmount(value: number | null | undefined) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function errorText(err: unknown) {
  if (err instanceof ApiHttpError) return err.message
  if (err instanceof Error) return err.message
  return "Something went wrong."
}

export function modeHint(mode: ConcessionMode) {
  if (mode === "fixed_payable") return "The student pays exactly this amount for the fee type each month."
  if (mode === "fixed_discount") return "Subtract this amount from the base fee."
  if (mode === "percent") return "Discount this percent of the base fee (0–100)."
  return "Waive the full amount for this fee type."
}

const PERCENT_MAX = 100

/** How a concession's value reads in lists: "10%", "PKR 500 off", "pays PKR 2,000", "full waiver". */
export function valueText(row: Pick<FeeConcession, "mode" | "value">) {
  if (row.mode === "percent") return `${formatAmount(row.value)}%`
  if (row.mode === "waiver") return "full waiver"
  if (row.mode === "fixed_payable") return `pays PKR ${formatAmount(row.value)}`
  return `PKR ${formatAmount(row.value)} off`
}

/** Same value rules as the API; null when the value is acceptable for the mode. */
export function valueError(mode: ConcessionMode, raw: string): string | null {
  if (mode === "waiver") return null
  const value = Number(raw)
  if (!raw.trim() || !Number.isFinite(value)) return "Enter a number."
  if (mode === "percent" && (value <= 0 || value > PERCENT_MAX)) return "Percent must be more than 0 and at most 100."
  if (mode === "fixed_discount" && value <= 0) return "The amount off must be more than 0."
  if (mode === "fixed_payable" && value < 0) return "The payable amount cannot be negative."
  return null
}
