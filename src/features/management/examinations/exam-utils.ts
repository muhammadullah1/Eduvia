import type { ExamSheetSummary, ExamSummary } from "@/api/exams/exams.service"

export const EXAM_DETAIL_TABS = ["overview", "papers", "marks", "results", "publish", "documents"] as const
export type ExamDetailTab = (typeof EXAM_DETAIL_TABS)[number]

/** Papers (mark sheets) of one class, in subject order. */
export function classPapers(exam: ExamSummary, classId: string): ExamSheetSummary[] {
  return exam.sheets
    .filter((sheet) => String(sheet.classId) === classId)
    .sort((a, b) => a.subject.localeCompare(b.subject))
}

export function formatTime(value: string | null) {
  if (!value) return ""
  const [h, m] = value.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`
}

export function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Published and finalised exams are part of the record: they can be archived, never deleted or edited. */
export function examLocks(exam: ExamSummary) {
  const locked = ["Published", "Finalised", "Archived"].includes(exam.status)
  return {
    canEdit: !locked,
    canDelete: !locked,
    canArchive: exam.status === "Published" || exam.status === "Finalised",
  }
}

export type ReviewState = {
  total: number
  submitted: number
  verified: number
  published: number
  action: "review" | "publish" | "done" | "blocked"
  label: string
  hint: string
}

/** Decides the next workflow step and, when it is blocked, says why in plain words. */
export function reviewState(exam: ExamSummary): ReviewState {
  const total = exam.sheets.length
  const count = (status: string) => exam.sheets.filter((sheet) => sheet.status === status).length
  const submitted = count("Submitted")
  const verified = count("Verified")
  const published = count("Published")
  const base = { total, submitted, verified, published }
  if (total === 0) {
    return { ...base, action: "blocked", label: "Mark reviewed", hint: "This exam has no papers yet." }
  }
  if (published === total) {
    return { ...base, action: "done", label: "Published", hint: "Results are published." }
  }
  if (verified === total) {
    return { ...base, action: "publish", label: "Publish results", hint: `All ${total} sheets are reviewed.` }
  }
  if (submitted + verified === total && submitted > 0) {
    return { ...base, action: "review", label: "Mark reviewed", hint: `All ${total} sheets are submitted.` }
  }
  const ready = submitted + verified + published
  return {
    ...base,
    action: "blocked",
    label: "Mark reviewed",
    hint: `${ready} of ${total} sheets submitted. Every sheet must be submitted before review.`,
  }
}
