import { ExternalLink } from "lucide-react"

import type { TimetableSlot } from "@/data/types"
import { Button } from "@/components/ui/button"
import { TimetableClassGrid } from "@/features/management/timetable/timetable-class-grid"
import type { PeriodTimeMap } from "@/lib/timetable-period-times"

type Props = {
  slots: TimetableSlot[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  periodCount: number
  periodTimes: PeriodTimeMap
  onManageTimetable?: () => void
}

export function ClassDetailTimetableTab({
  slots,
  loading,
  error,
  onRetry,
  periodCount,
  periodTimes,
  onManageTimetable,
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-[var(--cls-muted)]">
          Weekly preview for this class. Edit period times and assign subjects on
          the Timetable page.
        </p>
        {onManageTimetable ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={onManageTimetable}
          >
            <ExternalLink data-icon="inline-start" />
            Open timetable
          </Button>
        ) : null}
      </div>
      <TimetableClassGrid
        slots={slots}
        periodCount={periodCount}
        periodTimes={periodTimes}
        onPeriodTimesChange={() => undefined}
        editablePeriodTimes={false}
      />
    </div>
  )
}
