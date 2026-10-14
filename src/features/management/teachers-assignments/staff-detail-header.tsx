import { ArrowLeft, CalendarDays, Send } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"

type Props = {
  staff: StaffDirectoryRow
  onBack: () => void
  timetableHref?: string
  canResendInvite?: boolean
  resending?: boolean
  onResendInvite?: () => void
}

export function StaffDetailHeader({
  staff,
  onBack,
  timetableHref,
  canResendInvite = false,
  resending = false,
  onResendInvite,
}: Props) {
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
        <Link to={timetableHref}>
          <CalendarDays data-icon="inline-start" />
          Timetable
        </Link>
      </Button>
    )
  }

  let inviteAction = null
  if (canResendInvite && onResendInvite) {
    inviteAction = (
      <Button
        type="button"
        size="sm"
        className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
        disabled={resending}
        onClick={onResendInvite}
      >
        <Send data-icon="inline-start" />
        {resending ? "Sending…" : "Send activation email"}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
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
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--cls-muted)]">
            Staff profile
          </p>
          <p className="truncate text-sm font-semibold text-[var(--cls-ink)]">
            {staff.name}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {inviteAction}
        {timetableAction}
      </div>
    </div>
  )
}
