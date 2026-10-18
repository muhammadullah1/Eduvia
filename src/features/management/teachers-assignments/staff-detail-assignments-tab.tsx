import { CalendarDays, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"

type Props = {
  staff: StaffDirectoryRow
  timetableHref: string
}

export function StaffDetailAssignmentsTab({ staff, timetableHref }: Props) {
  const hasClasses = staff.classLabels.length > 0

  return (
    <div className="grid max-w-3xl gap-5">
      <div className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/50 px-4 py-3 text-sm text-[var(--cls-muted)]">
        Classes are created when this teacher is assigned on the{" "}
        <span className="font-medium text-[var(--cls-ink)]">weekly timetable</span>
        . In Class view, use{" "}
        <span className="font-medium text-[var(--cls-ink)]">+</span> on empty
        cells to assign them.
      </div>

      {hasClasses ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {staff.classLabels.map((label) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3.5 text-sm font-medium text-[var(--cls-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
            >
              {label}
              <ChevronRight className="size-4 text-[var(--cls-muted)]" aria-hidden />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <CalendarDays className="size-6" />
          </div>
          <p className="text-sm font-medium text-[var(--cls-ink)]">
            No classes assigned yet
          </p>
          <p className="max-w-sm text-sm text-[var(--cls-muted)]">
            {staff.firstName} will appear here once they teach at least one
            section on the timetable.
          </p>
        </div>
      )}

      <Button
        type="button"
        className="w-fit bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
        asChild
      >
        <Link to={timetableHref}>Go to timetable</Link>
      </Button>
    </div>
  )
}
