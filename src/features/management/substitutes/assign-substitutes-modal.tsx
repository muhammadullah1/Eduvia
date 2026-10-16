import { useMemo, useState } from "react"

import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ClassSection, Substitution, TeacherAbsence } from "@/data/types"
import { StaffAvatar } from "@/features/management/teachers-assignments/staff-avatar"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { classLabel, formatDate } from "@/lib/format"

import type { SubstituteTeacherOption } from "./hooks/use-teachers-list"
import { SubstitutePeriodChips } from "./substitute-period-chips"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId: string
  teacherName: string
  teacherSubject?: string
  date: string
  absences: TeacherAbsence[]
  substitutions: Substitution[]
  teachers: SubstituteTeacherOption[]
  classes: ClassSection[]
  teacherNameById: (id: string) => string
  onAssign: (
    absenceId: string,
    substituteId: string
  ) => Promise<string | undefined>
  onDone: () => void
}

export function AssignSubstitutesModal({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  teacherSubject,
  date,
  absences,
  substitutions,
  classes,
  teacherNameById,
  onAssign,
  onDone,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPicks, setPendingPicks] = useState<Record<string, string>>({})

  const rows = useMemo(
    () =>
      absences
        .filter(
          (row) =>
            row.teacherId === teacherId &&
            row.date === date &&
            row.status === "Pending"
        )
        .sort((a, b) => a.periodIndex - b.periodIndex),
    [absences, teacherId, date]
  )

  function subForAbsence(absenceId: string) {
    return substitutions.find((sub) => sub.absenceId === absenceId)
  }

  const pickedCount = rows.filter(
    (row) => pendingPicks[row.id] && !subForAbsence(row.id)
  ).length
  const allPicked =
    rows.length > 0 &&
    rows.every((row) => {
      if (subForAbsence(row.id)) return true
      return Boolean(pendingPicks[row.id])
    })

  const coveredCount = rows.filter((row) => subForAbsence(row.id)).length

  function pick(absenceId: string, substituteId: string) {
    setPendingPicks((prev) => ({ ...prev, [absenceId]: substituteId }))
  }

  async function confirmAssignments() {
    for (const row of rows) {
      const subId = pendingPicks[row.id]
      if (!subId) continue
      if (subForAbsence(row.id)) continue
      const err = await onAssign(row.id, subId)
      if (err) {
        setConfirmOpen(false)
        return
      }
    }
    setPendingPicks({})
    setConfirmOpen(false)
    onDone()
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
            <DialogTitle className="text-lg text-[var(--cls-ink)]">
              Assign substitutes
            </DialogTitle>
            <DialogDescription>
              Choose a cover teacher for each affected period. Busy teachers
              cannot be selected.
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
                Absent {formatDate(date)}
              </p>
            </div>
            <span className="ml-auto rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
              {rows.length - coveredCount} to assign
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {rows.length === 0 ? (
              <p className="text-sm text-[var(--cls-muted)]">
                All periods are covered or there is nothing pending.
              </p>
            ) : (
              rows.map((row) => {
                const existing = subForAbsence(row.id)
                const classLine = row.classId
                  ? `${classLabel(classes, row.classId)} · ${row.subject ?? ""}`
                  : "Free period"
                const selectedId =
                  pendingPicks[row.id] ?? existing?.substituteTeacherId

                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-[var(--cls-border)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--cls-ink)]">
                          Period {row.periodIndex}
                        </p>
                        <p className="text-xs text-[var(--cls-muted)]">
                          {classLine}
                        </p>
                      </div>
                      {existing ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Assigned
                        </span>
                      ) : null}
                    </div>
                    {existing ? (
                      <p className="mt-2 text-sm text-emerald-800">
                        Cover: {teacherNameById(existing.substituteTeacherId)}
                      </p>
                    ) : (
                      <SubstitutePeriodChips
                        absence={row}
                        assignedSubstituteId={selectedId}
                        onPick={(id) => pick(row.id, id)}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className={`${CLS_MODAL_FOOTER} sm:justify-between`}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
              disabled={!allPicked || rows.length === 0}
              onClick={() => setConfirmOpen(true)}
            >
              Confirm substitutes ({coveredCount + pickedCount}/{rows.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm substitute assignments?"
        description={`You are assigning cover for ${pickedCount} period(s) for ${teacherName} on ${formatDate(date)}. This will be recorded in the substitution log.`}
        confirmLabel="Confirm"
        onConfirm={() => void confirmAssignments()}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
