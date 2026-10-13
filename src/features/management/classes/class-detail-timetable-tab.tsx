import type { TimetableSlot } from "@/data/types"
import { cn } from "@/lib/utils"

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

function sortDay(a: string, b: string) {
  const ia = DAY_ORDER.findIndex((d) => d.toLowerCase() === a.toLowerCase())
  const ib = DAY_ORDER.findIndex((d) => d.toLowerCase() === b.toLowerCase())
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
}

type Props = {
  slots: TimetableSlot[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  periodCount: number
}

export function ClassDetailTimetableTab({
  slots,
  loading,
  error,
  onRetry,
  periodCount,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-14 text-center text-sm text-[var(--cls-muted)]">
        Loading timetable…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 px-6 py-10 text-center">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          Could not load timetable
        </p>
        <p className="mt-1 text-sm text-[var(--cls-muted)]">
          Check your connection and try again.
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

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-14 text-center">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          No timetable yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--cls-muted)]">
          Add periods for this class under Academic Management → Timetable. This
          class is configured for {periodCount} periods per day.
        </p>
      </div>
    )
  }

  const days = [...new Set(slots.map((s) => s.day))].sort(sortDay)
  const maxPeriod = Math.max(
    periodCount,
    ...slots.map((s) => s.periodIndex),
    1
  )

  const byDayPeriod = new Map<string, TimetableSlot>()
  for (const slot of slots) {
    byDayPeriod.set(`${slot.day}-${slot.periodIndex}`, slot)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--cls-border)] bg-[var(--page-wash)]/90">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--cls-muted)]">
                Period
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-3 py-3 text-xs font-semibold text-[var(--cls-muted)]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxPeriod }, (_, i) => i + 1).map(
              (period) => (
                <tr
                  key={period}
                  className="border-b border-[var(--cls-border)] last:border-0"
                >
                  <td className="px-4 py-3 text-xs font-medium text-[var(--cls-muted)]">
                    {period}
                  </td>
                  {days.map((day) => {
                    const slot = byDayPeriod.get(`${day}-${period}`)
                    return (
                      <td key={day} className="px-3 py-2 align-top">
                        {slot ? (
                          <div
                            className={cn(
                              "rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-2.5 py-2"
                            )}
                          >
                            <p className="text-[13px] font-medium text-[var(--cls-ink)]">
                              {slot.subject}
                            </p>
                            {slot.teacher ? (
                              <p className="mt-0.5 text-[11px] text-[var(--cls-muted)]">
                                {slot.teacher}
                              </p>
                            ) : null}
                            {slot.time ? (
                              <p className="mt-0.5 text-[10px] tabular-nums text-[var(--cls-muted)]">
                                {slot.time}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--cls-muted)]">
                            —
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
