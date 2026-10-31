import { ArrowLeft, CalendarDays, Pencil, Send, Trash2 } from "lucide-react"
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
  onEdit?: () => void
  onDelete?: () => void
  deleting?: boolean
}

/** Back button on its own row, then the name with the page actions: secondary outline, Edit as the filled primary. */
export function StaffDetailHeader({
  staff,
  onBack,
  timetableHref,
  canResendInvite = false,
  resending = false,
  onResendInvite,
  onEdit,
  onDelete,
  deleting = false,
}: Props) {
  const showTimetable = staff.role === "teacher" && Boolean(timetableHref)
  const showInvite = canResendInvite && Boolean(onResendInvite)
  let inviteLabel = "Send activation email"
  if (resending) inviteLabel = "Sending…"
  let deleteLabel = "Delete"
  if (deleting) deleteLabel = "Deleting…"

  return (
    <div className="flex flex-col items-start gap-4">
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
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[var(--cls-muted)] uppercase">Staff profile</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">{staff.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {showTimetable && timetableHref && (
            <Button variant="outline" asChild>
              <Link to={timetableHref}>
                <CalendarDays data-icon="inline-start" />
                Timetable
              </Link>
            </Button>
          )}
          {showInvite && (
            <Button type="button" variant="outline" disabled={resending} onClick={onResendInvite}>
              <Send data-icon="inline-start" />
              {inviteLabel}
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trash2 data-icon="inline-start" />
              {deleteLabel}
            </Button>
          )}
          {onEdit && (
            <Button type="button" onClick={onEdit}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
