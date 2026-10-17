import { BookOpen, CalendarDays, Mail, Phone } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"
import type { StaffDetailTabId } from "@/features/management/teachers-assignments/staff-detail-tabs"

type Props = {
  staff: StaffDirectoryRow
  isTeacher: boolean
  timetableHref: string
  onGoToTab?: (tab: StaffDetailTabId) => void
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[120px] flex-1 flex-col gap-1.5">
      <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--cls-ink)]">{value}</p>
    </div>
  )
}

function staffIdLabel(staff: StaffDirectoryRow) {
  if (staff.employeeCode && staff.employeeCode !== "—") {
    return staff.employeeCode
  }
  return `#${staff.id}`
}

export function StaffDetailSummaryCard({
  staff,
  isTeacher,
  timetableHref,
  onGoToTab,
}: Props) {
  const classCount = staff.classLabels.length
  let classSummary = "Not on timetable yet"
  if (classCount === 1) classSummary = "1 class"
  if (classCount > 1) classSummary = `${classCount} classes`

  return (
    <div className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-start gap-6">
          <MetaField label="Staff ID" value={staffIdLabel(staff)} />
          <MetaField label="Role" value={staff.roleLabel} />
          <MetaField label="Email" value={staff.email} />
          <MetaField label="Phone" value={staff.phone} />
          {isTeacher ? (
            <>
              <MetaField label="Subject" value={staff.subjectName} />
              <MetaField label="Classes" value={classSummary} />
            </>
          ) : null}
        </div>

        {isTeacher ? (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {onGoToTab ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[var(--cls-border)]"
                onClick={() => onGoToTab("subject")}
              >
                <BookOpen data-icon="inline-start" />
                Manage subject
              </Button>
            ) : null}
            {onGoToTab ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[var(--cls-border)]"
                onClick={() => onGoToTab("assignments")}
              >
                <CalendarDays data-icon="inline-start" />
                View classes
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--cls-border)]"
              asChild
            >
              <Link to={timetableHref}>Open timetable</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[var(--cls-border)]"
              asChild
            >
              <a href={`mailto:${staff.email}`}>
                <Mail data-icon="inline-start" />
                Email
              </a>
            </Button>
            {staff.phone && staff.phone !== "—" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[var(--cls-border)]"
                asChild
              >
                <a href={`tel:${staff.phone}`}>
                  <Phone data-icon="inline-start" />
                  Call
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
