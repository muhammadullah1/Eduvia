import { CalendarDays } from "lucide-react"

import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"

type Props = {
  viewDate: string
  onViewDateChange: (date: string) => void
  absentTeacherCount: number
  pendingCount: number
  coveredCount: number
  totalPeriods: number
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "neutral" | "warning" | "success"
}) {
  let toneClass =
    "border-[var(--cls-border)] bg-white text-[var(--cls-ink)]"
  if (tone === "warning") {
    toneClass = "border-amber-200/90 bg-amber-50/80 text-amber-950"
  }
  if (tone === "success") {
    toneClass = "border-emerald-200/90 bg-emerald-50/80 text-emerald-950"
  }

  return (
    <div
      className={cn(
        "flex min-w-[5.5rem] flex-1 flex-col rounded-lg border px-3 py-2 sm:min-w-0 sm:flex-none",
        toneClass
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums leading-tight">
        {value}
      </span>
    </div>
  )
}

export function SubstitutesDayToolbar({
  viewDate,
  onViewDateChange,
  absentTeacherCount,
  pendingCount,
  coveredCount,
  totalPeriods,
}: Props) {
  const allCovered = totalPeriods > 0 && pendingCount === 0

  return (
    <div className="rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--cls-ink)]">
            <CalendarDays
              className="size-4 shrink-0 text-[var(--cls-brand)]"
              aria-hidden
            />
            <span>{formatDate(viewDate)}</span>
          </div>
          <DatePicker
            value={viewDate}
            onChange={onViewDateChange}
            placeholder="Change date"
            defaultMonthKind="today"
            className="h-9 w-full border-[var(--cls-border)] bg-[var(--page-wash)]/50 text-sm sm:max-w-[11.5rem]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-stretch lg:justify-end">
          <Stat label="Absent staff" value={absentTeacherCount} />
          <Stat label="Periods" value={totalPeriods} />
          <Stat
            label="Pending"
            value={pendingCount}
            tone={pendingCount > 0 ? "warning" : "neutral"}
          />
          <Stat
            label="Covered"
            value={coveredCount}
            tone={allCovered ? "success" : "neutral"}
          />
        </div>
      </div>

      {allCovered ? (
        <div className="border-t border-emerald-200/60 bg-emerald-50/50 px-4 py-2.5 text-center text-xs font-medium text-emerald-900 lg:px-5 lg:text-left">
          All substitute assignments are complete for this date.
        </div>
      ) : null}
    </div>
  )
}
