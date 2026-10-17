import type { ClassSection, TimetableSlot } from "@/data/types"
import { classDisplayName } from "@/api/classes/map-class"
import { WEEKDAYS } from "@/lib/academics"
import { subjectCellTheme } from "@/lib/timetable-subject-theme"
import { cn } from "@/lib/utils"

const DAY_COL_MIN = "min-w-[116px]"
const PERIOD_COL_WIDTH = "w-[120px] min-w-[120px]"

type Props = {
  slots: TimetableSlot[]
  classes: ClassSection[]
  periodCount: number
  onSelectSlot?: (slot: TimetableSlot) => void
}

export function TimetableTeacherGrid({
  slots,
  classes,
  periodCount,
  onSelectSlot,
}: Props) {
  const classById = new Map(classes.map((c) => [c.id, c]))
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
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((period) => (
              <tr
                key={period}
                className="border-b border-[var(--cls-border)] last:border-0"
              >
                <td
                  className={cn(
                    PERIOD_COL_WIDTH,
                    "sticky left-0 z-10 border-r border-[var(--cls-border)] bg-[#F8FAFC] px-4 py-3 align-top"
                  )}
                >
                  <p className="text-[13px] font-semibold text-[var(--cls-ink)]">
                    P{period}
                  </p>
                </td>
                {WEEKDAYS.map((day) => {
                  const slot = byDayPeriod.get(`${day}-${period}`)
                  const theme = slot ? subjectCellTheme(slot.subject) : null
                  const klass = slot ? classById.get(slot.classId) : undefined
                  return (
                    <td key={day} className={cn(DAY_COL_MIN, "p-2 align-top")}>
                      {slot ? (
                        <button
                          type="button"
                          disabled={!onSelectSlot}
                          onClick={() => onSelectSlot?.(slot)}
                          style={
                            theme
                              ? {
                                  backgroundColor: theme.background,
                                  borderColor: theme.border,
                                }
                              : undefined
                          }
                          className={cn(
                            "flex min-h-[60px] w-full flex-col justify-center rounded-[10px] border px-3 py-2.5 text-left",
                            onSelectSlot && "hover:brightness-[0.98]"
                          )}
                        >
                          <p
                            className="text-[13px] font-semibold leading-snug"
                            style={{ color: theme?.subject }}
                          >
                            {klass ? classDisplayName(klass) : "Class"}
                          </p>
                          <p
                            className="mt-1 text-[11px] font-medium"
                            style={{ color: theme?.teacher }}
                          >
                            {slot.subject}
                            {slot.time ? ` · ${slot.time}` : ""}
                          </p>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
