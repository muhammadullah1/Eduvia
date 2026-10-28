import type { ConcessionCategory, ConcessionMode, ConcessionStatus } from "@/api/fees/concessions.service"
import type { StatusChipTone } from "@/components/app/status-chip"
import { ApiHttpError } from "@/lib/api"

export const MODE_LABEL: Record<ConcessionMode, string> = {
  fixed_payable: "Fixed payable",
  fixed_discount: "Fixed discount",
  percent: "Percent discount",
  waiver: "Full waiver",
}

export const CATEGORY_LABEL: Record<ConcessionCategory, string> = {
  Standard: "Standard",
  Scholarship: "Scholarship",
  Sibling: "Sibling / family",
  Other: "Other",
}

export const STATUS_TONE: Record<ConcessionStatus, StatusChipTone> = {
  Draft: "neutral",
  PendingApproval: "warning",
  Approved: "success",
  Rejected: "danger",
  Revoked: "danger",
}

export function formatAmount(value: number) {
  return value.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function errorText(err: unknown) {
  if (err instanceof ApiHttpError) return err.message
  if (err instanceof Error) return err.message
  return "Something went wrong."
}

export function modeHint(mode: ConcessionMode) {
  switch (mode) {
    case "fixed_payable":
      return "Student pays this fixed amount; the rest is discounted."
    case "fixed_discount":
      return "Subtract this amount from the base fee."
    case "percent":
      return "Discount this percent of the base fee (0–100)."
    case "waiver":
      return "Waive the full amount for the selected fee types."
  }
}
