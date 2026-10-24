import type { LifecycleEvent } from "@/api/students/lifecycle.service"

import { EVENT_LABELS } from "./lifecycle-rules"

const csvCell = (value: string | number | boolean | null | undefined) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`

const HEADER = [
  "Date",
  "Type",
  "Student",
  "Admission no.",
  "From class",
  "To class",
  "Session",
  "From status",
  "To status",
  "Reason category",
  "Reason",
  "Final result",
  "Academic status",
  "Outstanding",
  "Transferred to",
  "Graduation override",
  "Recorded by",
]

export function lifecycleToCsv(events: LifecycleEvent[]) {
  const rows = events.map((event) => [
    event.date,
    EVENT_LABELS[event.type] ?? event.type,
    event.student?.name,
    event.student?.admissionNo,
    event.fromClass,
    event.toClass,
    event.session,
    event.fromStatus,
    event.toStatus,
    event.reasonCategory,
    event.reason,
    event.finalResult,
    event.academicStatus,
    event.outstandingAmount == null ? "" : event.outstandingAmount.toFixed(2),
    event.transferToSchool,
    event.graduationOverride ? "Yes" : "",
    event.recordedBy,
  ])
  return [HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
}
