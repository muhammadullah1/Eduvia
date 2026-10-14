import type { TimetableSlot } from "@/data/types"
import { TimePicker } from "@/components/ui/time-picker"
import { WEEKDAYS } from "@/lib/academics"
import {
  periodTimeRangeLabel,
  timeForPeriod,
  type PeriodTimeMap,
  WEEKDAY_SHORT,
} from "@/lib/timetable-period-times"
import { subjectCellTheme } from "@/lib/timetable-subject-theme"
import { cn } from "@/lib/utils"

import type { SchedulePeriodPrefill } from "@/features/management/classes/class-schedule-period-modal"

const PERIOD_COL_WIDTH = "w-[152px] min-w-[152px] max-w-[152px]"
const DAY_COL_MIN = "min-w-[116px]"

type Props = {
  slots: TimetableSlot[]
  periodCount: number
  periodTimes: PeriodTimeMap
  onPeriodTimesChange: (map: PeriodTimeMap) => void
  editablePeriodTimes?: boolean
  onSchedulePeriod?: (prefill?: SchedulePeriodPrefill) => void
  onEditSlot?: (slot: TimetableSlot) => void
}

export function TimetableClassGrid({
  slots,
  periodCount,
  periodTimes,
  onPeriodTimesChange,
  editablePeriodTimes = false,
  onSchedulePeriod,
  onEditSlot,
}: Props) {
  const canAssign = Boolean(onSchedulePeriod)
  const maxPeriod = Math.max(
    periodCount,
    ...slots.map((s) => s.periodIndex),
    1
  )

  const byDayPeriod = new Map<string, TimetableSlot>()
  for (const slot of slots) {
    byDayPeriod.set(`${slot.day}-${slot.periodIndex}`, slot)
  }

  function updatePeriodStart(period: number, value: string) {
    const map = { ...periodTimes, [period]: value }
    onPeriodTimesChange(map)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--cls-border)] bg-[#F6F8FA]">
              <th
                className={cn(
                  PERIOD_COL_WIDTH,
                  "sticky left-0 z-20 border-r border-[var(--cls-border)] bg-[#F6F8FA] px-4 py-3.5 text-left text-xs font-semibold text-[var(--cls-muted)]"
                )}
              >
                Period
              </th>
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  className={cn(
                    DAY_COL_MIN,
                    "px-2 py-3.5 text-center text-xs font-semibold text-[var(--cls-muted)]"
                  )}
                >
                  {WEEKDAY_SHORT[day] ?? day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => {
              const start = timeForPeriod(periodTimes, period)
              return (
                <tr
                  key={period}
                  className="border-b border-[var(--cls-border)] last:border-0"
                >
                  <td
                    className={cn(
                      PERIOD_COL_WIDTH,
                      "sticky left-0 z-10 border-r border-[var(--cls-border)] bg-[#F8FAFC] px-4 py-3 align-top shadow-[4px_0_12px_-8px_rgba(15,23,42,0.12)]"
                    )}
                  >
                    <p className="text-[13px] font-semibold text-[var(--cls-ink)]">
                      Period {period}
                    </p>
                    {editablePeriodTimes ? (
                      <div className="mt-2.5 flex flex-col gap-2">
                        <TimePicker
                          value={start}
                          onChange={(next) => updatePeriodStart(period, next)}
                          className="w-full max-w-[8.5rem]"
                        />
                        <p className="text-[11px] font-medium tabular-nums text-[var(--cls-muted)]">
                          {periodTimeRangeLabel(start)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-medium tabular-nums text-[var(--cls-muted)]">
                        {periodTimeRangeLabel(start)}
                      </p>
                    )}
                  </td>
                  {WEEKDAYS.map((day) => {
                    const slot = byDayPeriod.get(`${day}-${period}`)
                    const theme = slot
                      ? subjectCellTheme(slot.subject)
                      : null
                    return (
                      <td
                        key={day}
                        className={cn(DAY_COL_MIN, "p-2 align-top")}
                      >
                        {slot ? (
                          <button
                            type="button"
                            disabled={!onEditSlot}
                            onClick={() => onEditSlot?.(slot)}
                            style={
                              theme
                                ? {
                                    backgroundColor: theme.background,
                                    borderColor: theme.border,
                                  }
                                : undefined
                            }
                            className={cn(
                              "flex min-h-[60px] w-full flex-col justify-center rounded-[10px] border px-3 py-2.5 text-left shadow-[0_1px_0_rgba(16,24,40,0.04)] transition-[filter,transform]",
                              onEditSlot &&
                                "hover:brightness-[0.98] active:scale-[0.995]"
                            )}
                          >
                            <p
                              className="text-[13px] font-semibold leading-snug"
                              style={{ color: theme?.subject }}
                            >
                              {slot.subject}
                            </p>
                            {slot.teacher ? (
                              <p
                                className="mt-1 text-[11px] font-medium leading-snug"
                                style={{ color: theme?.teacher }}
                              >
                                {slot.teacher}
                              </p>
                            ) : null}
                          </button>
                        ) : canAssign ? (
                          <button
                            type="button"
                            className="flex min-h-[60px] w-full items-center justify-center rounded-[10px] border border-dashed border-[#D5DDE8] bg-[#FAFBFC] text-xl font-light leading-none text-[#94A3B8] transition-colors hover:border-[var(--cls-brand)]/45 hover:bg-[#E8F7EE]/70 hover:text-[var(--cls-brand)]"
                            onClick={() =>
                              onSchedulePeriod?.({ day, periodIndex: period })
                            }
                            aria-label={`Assign subject on ${day}, period ${period}`}
                          >
                            +
                          </button>
                        ) : (
                          <span
                            className="flex min-h-[60px] items-center justify-center rounded-[10px] text-xs text-[var(--cls-muted)]"
                          >
                            —
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
