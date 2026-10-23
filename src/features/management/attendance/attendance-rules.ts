import type { ReviewStatus } from "@/api/attendance/attendance-review.service"
import type { StatusChipTone } from "@/components/app/status-chip"

export const REVIEW_STATUSES: ReviewStatus[] = ["Present", "Absent", "Late", "Leave"]

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  Present: "Present",
  Absent: "Absent",
  Late: "Late",
  Leave: "On leave",
}

export const STATUS_TONES: Record<ReviewStatus, StatusChipTone> = {
  Present: "success",
  Absent: "danger",
  Late: "warning",
  Leave: "brand",
}

/** Shared trigger styling for every filter control (class, month, threshold) on the review page. */
export const FILTER_TRIGGER_CLASS = "w-full border-[var(--cls-border)] bg-white"

export const THRESHOLDS = [50, 60, 65, 70, 75, 80, 85, 90, 95]

export type EditForm = { status: ReviewStatus | ""; reason: string }

/** Field errors for the edit dialog; empty when the change can be saved. */
export function validateEdit(form: EditForm, current: ReviewStatus | null): Partial<Record<keyof EditForm, string>> {
  const errors: Partial<Record<keyof EditForm, string>> = {}
  if (!form.status) errors.status = "Choose a status."
  else if (form.status === current) errors.status = `Already marked ${STATUS_LABELS[current].toLowerCase()}. Pick a different status.`
  if (form.reason.trim().length < 3) errors.reason = "Give a reason of at least 3 characters."
  return errors
}

/** "8:05 AM" in the viewer's time zone, or "—". */
export function timeOf(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/** "29 Sep 2026, 10:15 AM". */
export function stampOf(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${timeOf(iso)}`
}

/** "September 2026" for `YYYY-MM`. */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

export function percentLabel(value: number | null): string {
  if (value === null) return "—"
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`
}

/** Bar colour: below threshold red, within 10 points amber, otherwise brand. */
export function percentTone(value: number | null, threshold: number): "danger" | "warning" | "good" | "none" {
  if (value === null) return "none"
  if (value < threshold) return "danger"
  if (value < threshold + 10) return "warning"
  return "good"
}

/** "Mr. Aslam (Father) · 0300 1234567" or a fallback. */
export function guardianLine(g: { name: string | null; relation: string | null; phone: string | null } | null): string {
  if (!g) return "No guardian on file"
  const who = [g.name, g.relation ? `(${g.relation})` : null].filter(Boolean).join(" ")
  return [who || null, g.phone].filter(Boolean).join(" · ") || "No guardian on file"
}

export const editWindowText = (days: number) =>
  days === 0 ? "on the same day" : `within ${days} day${days === 1 ? "" : "s"} of the attendance date`
