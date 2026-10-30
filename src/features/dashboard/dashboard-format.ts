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
