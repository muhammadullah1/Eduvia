import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StaffAvatar } from "@/features/management/teachers-assignments/staff-avatar"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useCoverPreview } from "./hooks/use-cover-preview"

export type AbsenceDraft = {
  teacherId: string
  date: string
  periods: number[]
  notes: string
}

/** Picked cover teacher id per period index. */
export type CoverPicks = Record<number, string>

type Props = {
  draft: AbsenceDraft
  teacherName: string
  teacherSubject?: string
  saving: boolean
  /** Shown when the user came from "Mark teacher absent"; keeps step 1 as it was. */
  onBack?: () => void
  onClose: () => void
  onConfirm: (picks: CoverPicks) => void
}

export function AssignSubstitutesModal({
  draft,
  teacherName,
  teacherSubject,
  saving,
  onBack,
  onClose,
  onConfirm,
}: Props) {
  const [picks, setPicks] = useState<CoverPicks>({})
  const { data: periods = [], isLoading, isError, refetch } = useCoverPreview(draft)

  const coverable = periods.filter((row) => row.class)
  const pickedCount = coverable.filter((row) => picks[row.periodIndex]).length

  function toggle(periodIndex: number, teacherId: string) {
    setPicks((prev) =>
      Object.fromEntries(
        Object.entries({ ...prev, [periodIndex]: teacherId }).filter(
          ([key, id]) => !(Number(key) === periodIndex && prev[periodIndex] === id)
        )
      )
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
          <DialogTitle className="text-lg text-[var(--cls-ink)]">
            Assign substitutes
          </DialogTitle>
          <DialogDescription>
            Pick a cover teacher for each period; click a picked teacher again
            to clear it. Periods left empty stay pending.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-[var(--cls-border)] bg-[var(--page-wash)]/50 px-6 py-4">
          <StaffAvatar name={teacherName} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--cls-ink)]">
              {teacherName}
            </p>
            <p className="text-xs text-[var(--cls-muted)]">
              {teacherSubject ? `${teacherSubject} · ` : ""}
              Absent {formatDate(draft.date)}
            </p>
          </div>
          <span className="ml-auto rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
            {pickedCount}/{coverable.length} assigned
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <p className="text-sm text-[var(--cls-muted)]">Loading periods…</p>
          ) : null}
          {isError ? (
            <button
              type="button"
              className="text-sm font-medium text-[var(--cls-brand)]"
              onClick={() => void refetch()}
            >
              Could not load free teachers — retry
            </button>
          ) : null}
          {periods.map((row) => (
            <div
              key={row.periodIndex}
              data-testid={`cover-period-${row.periodIndex}`}
              className="rounded-xl border border-[var(--cls-border)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <p className="text-sm font-semibold text-[var(--cls-ink)]">
                Period {row.periodIndex}
              </p>
              <p className="text-xs text-[var(--cls-muted)]">
                {row.class
                  ? `${row.class.label} · ${row.subject?.name ?? ""}`
                  : "Free period — nothing to cover"}
              </p>
              {row.class ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.free.map((person) => {
                    const id = String(person.id)
                    const selected = picks[row.periodIndex] === id
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggle(row.periodIndex, id)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm transition-colors",
                          selected
                            ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-900"
                            : "border-[var(--cls-border)] bg-white text-[var(--cls-ink)] hover:border-emerald-500/50 hover:bg-emerald-50/50"
                        )}
                      >
                        {person.name}
                        {person.sameSubject ? (
                          <span className="ml-1 text-[10px] text-emerald-700">
                            same subject
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                  {row.free.length === 0 ? (
                    <p className="text-xs text-[var(--cls-muted)]">
                      No free teachers this period
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <DialogFooter className={`${CLS_MODAL_FOOTER} sm:justify-between`}>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={onBack ?? onClose}
          >
            {onBack ? "Back" : "Cancel"}
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving || isLoading || isError}
            onClick={() => onConfirm(picks)}
          >
            {saving ? "Saving…" : `Confirm (${pickedCount}/${coverable.length} covered)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
