import type { ConcessionMode, ConcessionStatus } from "@/api/fees/concessions.service"
import type { StatusChipTone } from "@/components/app/status-chip"
import { ApiHttpError } from "@/lib/api"

export const MODE_LABEL: Record<ConcessionMode, string> = {
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
  if (mode === "fixed_discount") return "Subtract this amount from the base fee."
  if (mode === "percent") return "Discount this percent of the base fee (0–100)."
  return "Waive the full amount for this fee type."
}
