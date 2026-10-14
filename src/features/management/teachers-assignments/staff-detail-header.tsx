import { ArrowLeft, Mail } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"

import { ClsStatusBadge } from "./cls-status-badge"
import { StaffAvatar } from "./staff-avatar"
import { StaffRoleBadge } from "./staff-role-badge"

type Props = {
  staff: StaffDirectoryRow
  onBack: () => void
  timetableHref?: string
}

export function StaffDetailHeader({ staff, onBack, timetableHref }: Props) {
  let timetableAction = null
  if (staff.role === "teacher" && timetableHref) {
    timetableAction = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-[var(--cls-border)]"
        asChild
      >
        <Link to={timetableHref}>Timetable</Link>
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 border-b border-[var(--cls-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-[10px] border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-ink)] shadow-none hover:bg-[var(--cls-border)]/40"
          onClick={onBack}
          aria-label="Back to staff directory"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <StaffAvatar name={staff.name} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--cls-muted)]">
            Staff member
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--cls-ink)]">
              {staff.name}
            </h1>
            <StaffRoleBadge role={staff.role} />
            <ClsStatusBadge status={staff.status} />
          </div>
          <p className="mt-1 truncate text-[13px] text-[var(--cls-muted)]">
            {staff.email}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {timetableAction}
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
      </div>
    </div>
  )
}
