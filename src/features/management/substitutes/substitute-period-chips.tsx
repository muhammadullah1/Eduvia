import type { TeacherAbsence } from "@/data/types"
import { cn } from "@/lib/utils"

import { useAvailableSubstitutes } from "./hooks/use-available-substitutes"
import { useTeachersList } from "./hooks/use-teachers-list"

type Props = {
  absence: TeacherAbsence
  assignedSubstituteId?: string
  onPick: (substituteId: string) => void
}

export function SubstitutePeriodChips({
  absence,
  assignedSubstituteId,
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

  if (isLoading) {
    return (
      <p className="mt-3 text-xs text-[var(--cls-muted)]">
        Loading available teachers…
      </p>
    )
  }

  if (isError) {
    return (
      <button
        type="button"
        className="mt-3 text-xs font-medium text-[var(--cls-brand)]"
        onClick={() => void refetch()}
      >
        Could not load teachers — try again
      </button>
    )
  }

  const free = available?.free ?? []
  const freeIds = new Set(free.map((person) => person.id))
  const busy = teachers.filter(
    (person) =>
      person.id !== absence.teacherId && !freeIds.has(person.id)
  )

  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium text-[var(--cls-ink)]">
        Available substitutes
      </p>
      <div className="flex flex-wrap gap-2">
        {free.map((person) => {
          const selected = assignedSubstituteId === person.id
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onPick(person.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                selected
                  ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-900"
                  : "border-[var(--cls-border)] bg-white text-[var(--cls-ink)] hover:border-emerald-500/50 hover:bg-emerald-50/50"
              )}
            >
              {person.name}
            </button>
          )
        })}
        {busy.map((person) => (
          <button
            key={person.id}
            type="button"
            disabled
            title="Has a timetable clash or is already covering another period"
            className="cursor-not-allowed rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] px-3 py-2 text-sm text-[var(--cls-muted)] line-through opacity-70"
          >
            {person.name}
            <span className="ml-1 text-[10px] not-line-through text-amber-700">
              Busy
            </span>
          </button>
        ))}
      </div>
      {free.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--cls-muted)]">
          No teacher is free for this period.
        </p>
      ) : null}
    </div>
  )
}
