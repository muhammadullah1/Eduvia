import type { TeacherAbsence } from "@/data/types"
import { cn } from "@/lib/utils"

import { useAvailableSubstitutes } from "./hooks/use-available-substitutes"
import { useTeachersList } from "./hooks/use-teachers-list"

type Props = {
  absence: TeacherAbsence
  assignedSubstituteId?: string
  compact?: boolean
  onPick: (substituteId: string) => void
}

export function SubstitutePeriodChips({
  absence,
  assignedSubstituteId,
  compact = false,
  onPick,
}: Props) {
  const absenceNumId = Number(absence.id)
  const apiAbsenceId =
    Number.isFinite(absenceNumId) && absenceNumId > 0 ? absence.id : null

  const { data: available, isLoading, isError, refetch } =
    useAvailableSubstitutes(apiAbsenceId)
  const { data: teachers = [] } = useTeachersList()

  if (!apiAbsenceId) {
    return (
      <p className="mt-2 text-xs text-[var(--cls-muted)]">
        Save this absence to the server before assigning cover.
      </p>
    )
  }

  const wrapClass = compact ? "" : "mt-3"

  if (isLoading) {
    return (
      <p className={`${wrapClass} text-xs text-[var(--cls-muted)]`}>
        Loading…
      </p>
    )
  }

  if (isError) {
    return (
      <button
        type="button"
        className={`${wrapClass} text-xs font-medium text-[var(--cls-brand)]`}
        onClick={() => void refetch()}
      >
        Retry
      </button>
    )
  }

  const free = available?.free ?? []
  const freeIds = new Set(free.map((person) => person.id))
  const busy = teachers.filter(
    (person) =>
      person.id !== absence.teacherId && !freeIds.has(person.id)
  )

  const chipSize = compact
    ? "rounded-md border px-2 py-1 text-xs"
    : "rounded-lg border px-3 py-2 text-sm"

  return (
    <div className={wrapClass}>
      {!compact ? (
        <p className="mb-2 text-xs font-medium text-[var(--cls-ink)]">
          Available substitutes
        </p>
      ) : null}
      <div className="flex max-w-full flex-wrap gap-1.5">
        {free.map((person) => {
          const selected = assignedSubstituteId === person.id
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onPick(person.id)}
              className={cn(
                chipSize,
                "transition-colors",
                selected
                  ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-900"
                  : "border-[var(--cls-border)] bg-white text-[var(--cls-ink)] hover:border-emerald-500/50 hover:bg-emerald-50/50"
              )}
            >
              {person.name}
            </button>
          )
        })}
        {!compact
          ? busy.map((person) => (
              <button
                key={person.id}
                type="button"
                disabled
                title="Has a timetable clash or is already covering another period"
                className={cn(
                  chipSize,
                  "cursor-not-allowed border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)] line-through opacity-70"
                )}
              >
                {person.name}
                <span className="ml-1 text-[10px] not-line-through text-amber-700">
                  Busy
                </span>
              </button>
            ))
          : null}
      </div>
      {free.length === 0 ? (
        <p className="mt-1.5 text-xs text-[var(--cls-muted)]">
          No free teachers
        </p>
      ) : null}
    </div>
  )
}
