import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ClsSubjectBadge } from "@/features/management/teachers-assignments/cls-subject-badge"
import { shortenClassLabel } from "@/features/management/teachers-assignments/format-class-label"

type Props = {
  open: boolean
  teachers: StaffDirectoryRow[]
  timetableHref: string
  onClose: () => void
}

export function TeachingAssignmentsSheet({
  open,
  teachers,
  timetableHref,
  onClose,
}: Props) {
  const active = teachers.filter(
    (row) => row.status.toLowerCase() === "active"
  )

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-[var(--cls-border)] p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
          <SheetTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Teaching assignments
          </SheetTitle>
          <SheetDescription className="text-[13px] leading-relaxed">
            Class assignments are managed on the timetable. Each slot uses the
            teacher&apos;s assigned subject automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="divide-y divide-[var(--cls-border)]">
            {active.map((teacher) => (
              <li key={teacher.id} className="flex flex-col gap-2 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--cls-ink)]">
                    {teacher.name}
                  </p>
                  <ClsSubjectBadge label={teacher.subjectName} />
                </div>
                {teacher.classLabels.length === 0 ? (
                  <p className="text-xs text-[var(--cls-muted)]">
                    No classes on timetable
                  </p>
                ) : (
                  <p className="text-xs text-[var(--cls-muted)]">
                    {teacher.classLabels.map(shortenClassLabel).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {active.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--cls-muted)]">
              No active teachers yet.
            </p>
          ) : null}
        </div>

        <SheetFooter className="border-t border-[var(--cls-border)] px-6 py-4">
          <Button
            type="button"
            className="w-full bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            asChild
          >
            <Link to={timetableHref} onClick={onClose}>
              Open timetable to assign
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
