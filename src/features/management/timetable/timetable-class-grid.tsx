import type { TimetableSlot } from "@/data/types"
import { TimePicker } from "@/components/ui/time-picker"
import { WEEKDAYS } from "@/lib/academics"
import {
  isValidTime,
  periodTimeRangeLabel,
  saveClassPeriodTimes,
  timeForPeriod,
  type PeriodTimeMap,
  WEEKDAY_SHORT,
} from "@/lib/timetable-period-times"
import { subjectCellTheme } from "@/lib/timetable-subject-theme"
import { cn } from "@/lib/utils"

import type { SchedulePeriodPrefill } from "@/features/management/classes/class-schedule-period-modal"

type Props = {
  classId: string
  slots: TimetableSlot[]
  periodCount: number
  periodTimes: PeriodTimeMap
  onPeriodTimesChange: (map: PeriodTimeMap) => void
  editablePeriodTimes?: boolean
  onSchedulePeriod?: (prefill?: SchedulePeriodPrefill) => void
  onEditSlot?: (slot: TimetableSlot) => void
}

export function TimetableClassGrid({
  classId,
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
    if (isValidTime(value)) {
      saveClassPeriodTimes(classId, map)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--cls-border)] bg-[#F6F8FA]">
              <th className="min-w-[128px] px-4 py-3 text-xs font-semibold text-[var(--cls-muted)]">
                Period
              </th>
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  className="min-w-[108px] px-3 py-3 text-center text-xs font-semibold text-[var(--cls-muted)]"
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
                  <td className="bg-[#F8FAFC] px-4 py-3 align-top">
                    <p className="text-sm font-semibold text-[var(--cls-ink)]">
                      Period {period}
                    </p>
                    {editablePeriodTimes ? (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <TimePicker
                          value={start}
                          onChange={(next) => updatePeriodStart(period, next)}
                          className="w-[7.25rem]"
                        />
                        <p className="text-[11px] font-medium tabular-nums text-[var(--cls-muted)]">
                          {periodTimeRangeLabel(start)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] font-medium tabular-nums text-[var(--cls-muted)]">
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
                      <td key={day} className="px-1.5 py-1.5 align-top">
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
                              "w-full rounded-[10px] border px-2.5 py-2 text-left shadow-[0_1px_0_rgba(16,24,40,0.04)] transition-[filter,transform]",
                              onEditSlot &&
                                "hover:brightness-[0.98] active:scale-[0.99]"
                            )}
                          >
                            <p
                              className="text-[13px] font-semibold leading-tight"
                              style={{ color: theme?.subject }}
                            >
                              {slot.subject}
                            </p>
                            {slot.teacher ? (
                              <p
                                className="mt-1 text-[11px] font-medium leading-tight"
                                style={{ color: theme?.teacher }}
                              >
                                {slot.teacher}
                              </p>
                            ) : null}
                          </button>
                        ) : canAssign ? (
                          <button
                            type="button"
                            className="flex min-h-[54px] w-full items-center justify-center rounded-[10px] border border-dashed border-[#D5DDE8] bg-[#FAFBFC] text-lg font-light text-[#94A3B8] transition-colors hover:border-[var(--cls-brand)]/45 hover:bg-[#E8F7EE]/60 hover:text-[var(--cls-brand)]"
                            onClick={() =>
                              onSchedulePeriod?.({ day, periodIndex: period })
                            }
                          >
                            +
                          </button>
                        ) : (
                          <span
                            className="flex min-h-[54px] items-center justify-center rounded-[10px] border border-dashed border-transparent text-xs text-[var(--cls-muted)]"
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
