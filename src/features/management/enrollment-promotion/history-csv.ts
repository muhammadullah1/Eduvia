import type { EnrollmentEvent } from "@/api/students/promotions.service"

const csvCell = (value: string | null | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`

export function historyToCsv(events: EnrollmentEvent[]) {
  const header = ["Date", "Student", "Admission no.", "From", "To", "Session", "Type", "Recorded by"]
  const rows = events.map((event) => [
    event.date,
    event.student?.name,
    event.student?.admissionNo,
    event.fromClass,
    event.toClass,
    event.session,
    event.type,
    event.recordedBy,
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
}
