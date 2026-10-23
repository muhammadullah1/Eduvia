import {
  type ClassSubjectRow,
  subjectDaysLabel,
  subjectSummaryStats,
  subjectTeachersLabel,
} from "@/api/timetable/map-timetable"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
type Props = {
  className: string
  subjects: ClassSubjectRow[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onOpenTimetable?: () => void
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-2.5 py-2">
      <p className="text-[10px] font-medium text-[var(--cls-muted)]">{label}</p>
      <p className="text-[11px] font-semibold text-[var(--cls-ink)]">{value}</p>
    </div>
  )
}

function SubjectCard({ subject }: { subject: ClassSubjectRow }) {
  const days = subjectDaysLabel(subject.days)
  const teacher = subjectTeachersLabel(subject.teachers)

  return (
    <article
      className="flex flex-col gap-3.5 rounded-xl border border-[var(--cls-border)] bg-white px-3.5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[var(--cls-ink)]">
          {subject.name}
        </h3>
        <p className="text-[10px] font-semibold text-[var(--cls-muted)]">
          Code {subject.code}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <StatTile
            label="Periods / week"
            value={String(subject.periodCount)}
          />
          <StatTile label="Teacher" value={teacher} />
        </div>
        <div className="flex gap-2.5">
          <StatTile label="Days" value={days} />
          <div className="flex flex-1 flex-col gap-1 rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-2.5 py-2">
            <p className="text-[10px] font-medium text-[var(--cls-muted)]">
              Status
            </p>
            <StatusChip tone="success" showDot className="w-fit text-[11px]">
              Scheduled
            </StatusChip>
          </div>
        </div>
        {subject.roomLabel !== "—" ? (
          <StatTile label="Room" value={subject.roomLabel} />
        ) : null}
      </div>
    </article>
  )
}

function SummaryStrip({
  subjectCount,
  periodsPerWeek,
  teacherCount,
}: {
  subjectCount: number
  periodsPerWeek: number
  teacherCount: number
}) {
  const items = [
    { label: "Subjects", value: String(subjectCount) },
    { label: "Periods / week", value: String(periodsPerWeek) },
    { label: "Teachers", value: String(teacherCount) },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        >
          <p className="text-xs font-medium text-[var(--cls-muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--cls-ink)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function ClassDetailSubjectsTab({
  className,
  subjects,
  loading,
  error,
  onRetry,
  onOpenTimetable,
}: Props) {
  const stats = subjectSummaryStats(subjects)

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-14 text-center text-sm text-[var(--cls-muted)]">
        Loading subjects…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 px-6 py-10 text-center">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          Could not load subjects
        </p>
        {onRetry ? (
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-[var(--cls-brand)]"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[var(--cls-muted)]">
          Scheduled subjects for {className} (from the weekly timetable)
        </p>
        {onOpenTimetable ? (
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={onOpenTimetable}
          >
            Open timetable
          </Button>
        ) : null}
      </div>

      {subjects.length > 0 ? (
        <SummaryStrip
          subjectCount={stats.subjectCount}
          periodsPerWeek={stats.periodsPerWeek}
          teacherCount={stats.teacherCount}
        />
      ) : null}

      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-[var(--cls-ink)]">
            No subjects assigned yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--cls-muted)]">
            Assign subjects, days, and periods on the Timetable page. This tab
            updates automatically from the same schedule.
          </p>
          {onOpenTimetable ? (
            <Button
              type="button"
              className="mt-4 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
              onClick={onOpenTimetable}
            >
              Open timetable
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  )
}
