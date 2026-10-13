import { Button } from "@/components/ui/button"
import { ClassStatusBadge } from "@/features/management/classes/class-status-badge"
import type { ClassSubjectRow } from "@/features/management/classes/use-class-detail"
import { toast } from "@/lib/toast"

type Props = {
  className: string
  subjects: ClassSubjectRow[]
}

export function ClassDetailSubjectsTab({ className, subjects }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[var(--cls-muted)]">
          {subjects.length} subject{subjects.length === 1 ? "" : "s"} assigned
          to {className}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-[var(--cls-ink)] text-[13px]"
          onClick={() =>
            toast.message("Assign subject will link to timetable setup.")
          }
        >
          Assign Subject
        </Button>
      </div>
      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-12 text-center text-sm text-[var(--cls-muted)]">
          No subjects on the timetable for this class yet. Assign subjects when
          building the weekly timetable.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((subject) => (
            <li
              key={subject.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cls-border)] bg-white px-3 py-2.5"
            >
              <div>
                <p className="text-[13px] font-medium text-[var(--cls-ink)]">
                  {subject.name}
                </p>
                <p className="text-[10.5px] text-[var(--cls-muted)]">
                  {subject.code}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ClassStatusBadge status="Active" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[13px] text-[var(--cls-muted)]"
                  onClick={() =>
                    toast.message("Unassign will be available with subject API.")
                  }
                >
                  Unassign
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
