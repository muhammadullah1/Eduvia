import type {
  ChangeStatusBody,
  LifecycleEvent,
  LifecycleEventType,
  LifecycleHistoryParams,
  LifecycleStatus,
} from "@/api/students/lifecycle.service"
import type { StatusChipTone } from "@/components/app/status-chip"

/** SRS wording for each status (p14–16). */
export const STATUS_LABELS: Record<LifecycleStatus, string> = {
  Pending: "Pending",
  Active: "Active",
  Inactive: "Inactive",
  Graduated: "Graduated",
  StruckOff: "Struck off",
  Withdrawn: "Withdrawn",
}

export const EVENT_LABELS: Record<LifecycleEventType, string> = {
  Promoted: "Promoted",
  Repeated: "Held back",
  Enrolled: "Enrolled",
  Deactivated: "Deactivated",
  Reactivated: "Reactivated",
  Graduated: "Graduated",
  StruckOff: "Struck off",
  Withdrawn: "Enrollment withdrawn",
  Readmitted: "Readmitted",
}

export const EVENT_TONES: Record<LifecycleEventType, StatusChipTone> = {
  Promoted: "success",
  Repeated: "warning",
  Enrolled: "success",
  Deactivated: "neutral",
  Reactivated: "success",
  Graduated: "brand",
  StruckOff: "danger",
  Withdrawn: "neutral",
  Readmitted: "brand",
}

export const EVENT_TYPES = Object.keys(EVENT_LABELS) as LifecycleEventType[]

const READMIT_FROM: LifecycleStatus[] = ["StruckOff", "Graduated", "Withdrawn"]

export const isReadmission = (from: LifecycleStatus, to: LifecycleStatus | "") =>
  to === "Active" && READMIT_FROM.includes(from)

/** Verb shown on the option and the submit button for a move. */
export function actionLabel(from: LifecycleStatus, to: LifecycleStatus) {
  if (to === "Active") return from === "Pending" ? "Enroll" : from === "Inactive" ? "Reactivate" : "Readmit"
  if (to === "Inactive") return "Deactivate"
  if (to === "Graduated") return "Graduate"
  if (to === "StruckOff") return "Strike off"
  return "Withdraw enrollment"
}

/** One-line explanation under each option. */
export function actionHint(from: LifecycleStatus, to: LifecycleStatus) {
  if (to === "Active") {
    if (from === "Pending") return "Start attendance and monthly fees."
    if (from === "Inactive") return "Back to class. Months while inactive are not billed."
    return "Same record and admission number; pick the class and session."
  }
  if (to === "Inactive") return "Pause attendance and fees without leaving the school."
  if (to === "Graduated") return "Completed the final grade with a final result."
  if (to === "StruckOff") return "Left the school. Fee and academic status are recorded."
  return "The applicant never started. Only for pending students."
}

export type StatusForm = {
  to: LifecycleStatus | ""
  effectiveOn: string
  reason: string
  reasonCategory: string
  academicStatus: string
  transferToSchool: string
  finalResult: string
  graduationOverride: boolean
  classId: string
  sessionId: string
}

export const emptyStatusForm = (today: string): StatusForm => ({
  to: "",
  effectiveOn: today,
  reason: "",
  reasonCategory: "",
  academicStatus: "",
  transferToSchool: "",
  finalResult: "",
  graduationOverride: false,
  classId: "",
  sessionId: "",
})

export type StatusContext = {
  from: LifecycleStatus
  today: string
  admittedOn: string | null
  finalGrade: boolean
}

/** Mirrors the API rules so the dialog can explain what is missing before submitting. */
export function validateStatusForm(form: StatusForm, ctx: StatusContext): string | null {
  if (!form.to) return "Choose what happens to the student."
  if (!form.effectiveOn) return "Pick the effective date."
  if (form.effectiveOn > ctx.today) return "The effective date cannot be in the future."
  const admitted = ctx.admittedOn?.slice(0, 10)
  if (admitted && form.effectiveOn < admitted) return `The effective date cannot be before admission (${admitted}).`
  if ((form.to === "Inactive" || form.to === "StruckOff") && !form.reasonCategory) return "Choose a reason category."
  if (form.to === "StruckOff" && !form.academicStatus.trim()) return "Record the academic status at leaving."
  if (form.to === "Graduated") {
    if (!form.finalResult.trim()) return "Enter the final result."
    if (!ctx.finalGrade && !form.graduationOverride)
      return "This is not the final grade. Tick the override to graduate anyway."
  }
  if (isReadmission(ctx.from, form.to) && (!form.classId || !form.sessionId))
    return "Pick the class and session to readmit into."
  if (!form.reason.trim()) return "Add a short reason."
  return null
}

export function buildStatusBody(form: StatusForm, from: LifecycleStatus): ChangeStatusBody {
  const to = form.to as LifecycleStatus
  const body: ChangeStatusBody = { status: to, reason: form.reason.trim(), effectiveOn: form.effectiveOn }
  if (to === "Inactive" || to === "StruckOff") body.reasonCategory = form.reasonCategory
  if (to === "StruckOff") {
    body.academicStatus = form.academicStatus.trim()
    if (form.reasonCategory === "Transfer out" && form.transferToSchool.trim())
      body.transferToSchool = form.transferToSchool.trim()
  }
  if (to === "Graduated") {
    body.finalResult = form.finalResult.trim()
    body.graduationOverride = form.graduationOverride
  }
  if (isReadmission(from, to)) {
    body.classId = Number(form.classId)
    body.sessionId = Number(form.sessionId)
  }
  return body
}

export type HistoryFilters = {
  type: LifecycleEventType | ""
  from: string
  to: string
  classId: string
  sessionId: string
  reasonCategory: string
  q: string
}

export const emptyHistoryFilters: HistoryFilters = {
  type: "",
  from: "",
  to: "",
  classId: "",
  sessionId: "",
  reasonCategory: "",
  q: "",
}

/** Only non-empty filters go on the query string. */
export function historyParams(filters: HistoryFilters, page: number, pageSize: number): LifecycleHistoryParams {
  const params: LifecycleHistoryParams = { page, pageSize }
  if (filters.type) params.type = filters.type
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.classId) params.classId = Number(filters.classId)
  if (filters.sessionId) params.sessionId = Number(filters.sessionId)
  if (filters.reasonCategory) params.reasonCategory = filters.reasonCategory
  if (filters.q.trim()) params.q = filters.q.trim()
  return params
}

/** The main detail line for an event: class move, result, or reason category. */
export function eventDetail(event: LifecycleEvent) {
  if (event.type === "Promoted" || event.type === "Repeated")
    return `${event.fromClass ?? "—"} → ${event.toClass ?? "—"}`
  if (event.type === "Graduated")
    return [event.fromClass, event.finalResult, event.graduationOverride ? "override" : null].filter(Boolean).join(" · ")
  if (event.type === "Readmitted" || event.type === "Enrolled") return event.toClass ?? event.fromClass ?? ""
  if (event.type === "StruckOff") {
    const parts = [event.reasonCategory, event.transferToSchool ? `to ${event.transferToSchool}` : null]
    if (event.outstandingAmount != null) parts.push(`dues ${event.outstandingAmount.toFixed(2)}`)
    return parts.filter(Boolean).join(" · ")
  }
  return event.reasonCategory ?? ""
}

/** Reason categories (mirrors LIFECYCLE_REASONS in the API) for the history filter. */
export const REASON_CATEGORIES = [
  "Leave",
  "Medical",
  "Fee hold",
  "Transfer out",
  "Withdrawn by parent",
  "Long absence",
  "Disciplinary",
  "Policy",
  "Other",
]
