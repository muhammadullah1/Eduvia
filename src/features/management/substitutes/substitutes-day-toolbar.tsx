import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

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
  return (
    <div className="flex min-h-11 items-center gap-2.5 px-3.5 py-2">
      <span
        className={cn(
          "text-[22px] font-semibold leading-none tabular-nums",
          tone === "warning" && "text-amber-700",
          tone === "success" && "text-emerald-700",
          tone === "neutral" && "text-[var(--cls-ink)]"
        )}
      >
        {value}
      </span>
      <span className="text-sm leading-tight text-[var(--cls-muted)]">
        {label}
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
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:p-5">
        <DatePicker
          value={viewDate}
          onChange={onViewDateChange}
          placeholder="Choose date"
          defaultMonthKind="today"
          className="h-11 w-full text-[15px] sm:w-56"
        />

        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--cls-border)] overflow-hidden rounded-lg border border-[var(--cls-border)] sm:grid-cols-4 sm:divide-y-0">
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
