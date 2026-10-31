import type { AlertsWidget } from "@/api/dashboard/dashboard.service"
import { PAYMENT_METHODS } from "@/api/finance/finance.service"

/** Pure dashboard helpers (kept out of component files for fast refresh). */
export const percentText = (value: number | null) => {
  if (value === null) return "—"
  return `${value}%`
}

export const methodLabel = (key: string) => PAYMENT_METHODS.find((m) => m.key === key)?.label ?? key

/** "Tue 27" for a 7-day trend axis. */
export function dayLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" })
}

export const PENDING_LABELS = {
  lessonReviews: { label: "Lesson reviews", section: "lesson-plan" },
  marksToVerify: { label: "Marks to verify", section: "exams" },
  resultsToPublish: { label: "Results to publish", section: "exams" },
  concessions: { label: "Concession approvals", section: "fees" },
  adjustments: { label: "Fee adjustments", section: "fees" },
} as const

export type PendingKey = keyof typeof PENDING_LABELS

/** Whole-number share of `part` in `whole` for progress bars; 0 when there is nothing to share. */
export function share(part: number, whole: number) {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

/** Whole-number % change from `previous` to `current`; null when there is no base to compare. */
export function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** The point just before `day` in a date-sorted series (the last school day with data). */
export function pointBefore<T extends { date: string }>(points: T[], day: string) {
  return points.filter((point) => point.date < day).at(-1)
}

export type AlertItem = { key: string; text: string; detail: string; section: string }

/** Setup gaps and failures the school should fix, each linked to the page that fixes it. */
export function alertItems(alerts: AlertsWidget): AlertItem[] {
  const items: AlertItem[] = alerts.classesWithoutFeeStructure.map((row) => ({
    key: `class-${row.classId}`,
    text: `${row.label} has no fee structure`,
    detail: "Its students cannot be billed until one is added.",
    section: "fees",
  }))
  if (alerts.failedImports > 0) {
    items.push({ key: "imports", text: `${alerts.failedImports} offline import batches failed`, detail: "Review the errors and re-upload.", section: "offline-sync" })
  }
  return items
}

/** "1 month" / "3 months". */
export function plural(count: number, word: string) {
  if (count === 1) return word
  return `${word}s`
}
