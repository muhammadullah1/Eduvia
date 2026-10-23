import { ClipboardList, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import type { TeacherAbsence } from "@/data/types"
import { weekdayOf } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { formatDate } from "@/lib/format"

import {
  type AbsenceDraft,
  AssignSubstitutesModal,
  type CoverPicks,
} from "./assign-substitutes-modal"
import { useSubstituteMutations } from "./hooks/use-substitute-mutations"
import {
  useSubstitutionLog,
  useTeacherAbsencesForDate,
} from "./hooks/use-teacher-absences"
import { useTeachersList } from "./hooks/use-teachers-list"
import { MarkAbsentModal } from "./mark-absent-modal"
import { SubstitutesDayBoard } from "./substitutes-day-board"
import { SubstitutesDayToolbar } from "./substitutes-day-toolbar"
import { SubstitutionLogModal } from "./substitution-log-modal"

type CoverStep = {
  draft: AbsenceDraft
  /** True when opened from "Mark teacher absent", so Back returns to it. */
  fromMarkAbsent: boolean
}

function groupAbsencesByTeacher(rows: TeacherAbsence[]) {
  const map = new Map<string, TeacherAbsence[]>()
  for (const row of rows) {
    const list = map.get(row.teacherId) ?? []
    list.push(row)
    map.set(row.teacherId, list)
  }
  return map
}

export function SubstitutesPage() {
  const { state } = useSchool()
  const actor = useActor()

  const [markModalOpen, setMarkModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [coverStep, setCoverStep] = useState<CoverStep | null>(null)

  const [teacherId, setTeacherId] = useState("")
  const [absentDate, setAbsentDate] = useState(getToday)
  const [periods, setPeriods] = useState<number[]>([])
  const [notes, setNotes] = useState("")
  const [viewDate, setViewDate] = useState(getToday)

  const {
    data: teachers = [],
    isLoading: teachersLoading,
    isError: teachersError,
    refetch: refetchTeachers,
  } = useTeachersList()

  const {
    data: dayData,
    isLoading: absencesLoading,
    isError: absencesError,
    refetch: refetchAbsences,
  } = useTeacherAbsencesForDate(viewDate)

  const { data: logData } = useSubstitutionLog(logModalOpen)

  const { markAbsentWithCover, assign, removeCover, cancelAbsence } =
    useSubstituteMutations(actor.role)

  const teacher = teachers.find((person) => person.id === teacherId)
  const periodCount = Math.max(
    ...state.classes
      .filter((klass) => teacher?.classIds.includes(klass.id))
      .map((klass) => klass.periodCount),
    8
  )
  const teachingSlots = state.slots.filter(
    (slot) => slot.teacherId === teacherId && slot.day === weekdayOf(absentDate)
  )

  const dayRows = useMemo(
    () =>
      (dayData?.teacherAbsences ?? []).filter(
        (row) => row.status !== "Cancelled"
      ),
    [dayData?.teacherAbsences]
  )

  const substitutions = dayData?.substitutions ?? []
  const logSubstitutions = logData?.substitutions ?? state.substitutions

  const grouped = groupAbsencesByTeacher(dayRows)
  const pendingCount = dayRows.filter((row) => row.status === "Pending").length
  const coveredCount = dayRows.filter(
    (row) =>
      row.status === "Covered" ||
      substitutions.some((sub) => sub.absenceId === row.id)
  ).length

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of teachers) map.set(t.id, t.name)
    return (id: string) => map.get(id) ?? id
  }, [teachers])

  const coverTeacher = coverStep
    ? teachers.find((p) => p.id === coverStep.draft.teacherId)
    : undefined

  function togglePeriod(period: number) {
    setPeriods((list) =>
      list.includes(period)
        ? list.filter((item) => item !== period)
        : [...list, period].sort((a, b) => a - b)
    )
  }

  function resetMarkForm() {
    setTeacherId("")
    setPeriods([])
    setNotes("")
  }

  /** Step 1 → step 2. Nothing is saved until the substitutes are confirmed. */
  function continueToCover() {
    if (!teacherId || periods.length === 0) return
    setMarkModalOpen(false)
    setCoverStep({
      draft: { teacherId, date: absentDate, periods, notes: notes.trim() },
      fromMarkAbsent: true,
    })
  }

  function backToMarkAbsent() {
    setCoverStep(null)
    setMarkModalOpen(true)
  }

  function closeCover() {
    if (coverStep?.fromMarkAbsent) resetMarkForm()
    setCoverStep(null)
  }

  function coverPendingFor(tid: string) {
    const pending = dayRows
      .filter((row) => row.teacherId === tid && row.status === "Pending")
      .map((row) => row.periodIndex)
    if (!pending.length) return
    setCoverStep({
      draft: { teacherId: tid, date: viewDate, periods: pending, notes: "" },
      fromMarkAbsent: false,
    })
  }

  async function confirmCover(picks: CoverPicks) {
    if (!coverStep) return
    const { draft } = coverStep
    const assignments = Object.entries(picks).map(([period, subId]) => ({
      periodIndex: Number(period),
      substituteTeacherId: Number(subId),
    }))
    try {
      await markAbsentWithCover.mutateAsync({
        teacherId: Number(draft.teacherId),
        date: draft.date,
        periods: draft.periods,
        notes: draft.notes || undefined,
        assignments,
      })
      const open = draft.periods.length - assignments.length
      toast.success(
        `${teacherNameById(draft.teacherId)} marked absent · ${assignments.length} period(s) covered` +
          (open > 0 ? `, ${open} still pending` : "")
      )
      setViewDate(draft.date)
      resetMarkForm()
      setCoverStep(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the absence."
      )
    }
  }

  async function assignOne(
    absenceId: string,
    substituteId: string
  ): Promise<string | undefined> {
    const aId = Number(absenceId)
    const sId = Number(substituteId)
    if (!Number.isFinite(aId) || !Number.isFinite(sId)) {
      return "Invalid substitute selection."
    }
    try {
      await assign.mutateAsync({
        absenceId: aId,
        substituteTeacherId: sId,
      })
      toast.success(`${teacherNameById(substituteId)} assigned`)
      return undefined
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not assign substitute."
      toast.error(message)
      return message
    }
  }

  async function handleRemoveCover(absenceId: string) {
    const aId = Number(absenceId)
    if (!Number.isFinite(aId)) return
    try {
      await removeCover.mutateAsync(aId)
      toast.success("Substitute removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove cover.")
    }
  }

  async function handleCancelAbsence(absenceId: string) {
    const aId = Number(absenceId)
    if (!Number.isFinite(aId)) return
    try {
      await cancelAbsence.mutateAsync(aId)
      toast.success("Absence cancelled")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not cancel absence."
      )
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-brand)] sm:text-[28px]">
            Absent teacher &amp; substitutes
          </h1>
          <p className="mt-0.5 text-sm text-[var(--cls-muted)]">
            Mark absences and assign cover by period.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-9 border-[var(--cls-border)]"
            onClick={() => setLogModalOpen(true)}
          >
            <ClipboardList data-icon="inline-start" />
            Substitution log
            {logSubstitutions.length > 0 ? (
              <span className="ml-1 rounded-md bg-[var(--page-wash)] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--cls-muted)]">
                {logSubstitutions.length}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            className="h-9 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={() => setMarkModalOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Mark teacher absent
          </Button>
        </div>
      </div>

      <SubstitutesDayToolbar
        viewDate={viewDate}
        onViewDateChange={(value) => setViewDate(value || getToday())}
        absentTeacherCount={grouped.size}
        pendingCount={pendingCount}
        coveredCount={coveredCount}
        totalPeriods={dayRows.length}
      />

      {absencesError ? (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-10 text-center">
          <p className="text-sm text-[var(--cls-muted)]">
            Could not load absences for this date.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-[var(--cls-border)]"
            onClick={() => void refetchAbsences()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {absencesLoading && !dayData ? (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
          Loading schedule for {formatDate(viewDate)}…
        </div>
      ) : null}

      {!absencesLoading && dayRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-[var(--cls-ink)]">
            No absences on {formatDate(viewDate)}
          </p>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Mark a teacher absent to see periods and assign cover here.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-[var(--cls-border)]"
            onClick={() => setMarkModalOpen(true)}
          >
            Mark teacher absent
          </Button>
        </div>
      ) : null}

      {dayRows.length > 0 ? (
        <SubstitutesDayBoard
          viewDate={viewDate}
          classes={state.classes}
          teachers={teachers}
          grouped={grouped}
          substitutions={substitutions}
          teacherNameById={teacherNameById}
          onAssignTeacher={coverPendingFor}
          onAssignOne={(absenceId, substituteId) =>
            void assignOne(absenceId, substituteId)
          }
          onRemoveCover={(id) => void handleRemoveCover(id)}
          onCancelAbsence={(id) => void handleCancelAbsence(id)}
        />
      ) : null}

      <MarkAbsentModal
        open={markModalOpen}
        onOpenChange={setMarkModalOpen}
        teachers={teachers}
        teachersLoading={teachersLoading}
        teachersError={teachersError}
        onRetryTeachers={() => void refetchTeachers()}
        teacherId={teacherId}
        onTeacherIdChange={(id) => {
          setTeacherId(id)
          setPeriods([])
        }}
        date={absentDate}
        onDateChange={(value) => {
          setAbsentDate(value)
          setPeriods([])
        }}
        periods={periods}
        onTogglePeriod={togglePeriod}
        onSelectAllPeriods={() =>
          setPeriods(
            [...new Set(teachingSlots.map((slot) => slot.periodIndex))].sort(
              (a, b) => a - b
            )
          )
        }
        notes={notes}
        onNotesChange={setNotes}
        periodCount={periodCount}
        teachingSlots={teachingSlots}
        onSubmit={continueToCover}
      />

      <SubstitutionLogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        substitutions={logSubstitutions}
        classes={state.classes}
        nameOf={teacherNameById}
      />

      {coverStep ? (
        <AssignSubstitutesModal
          draft={coverStep.draft}
          teacherName={teacherNameById(coverStep.draft.teacherId)}
          teacherSubject={coverTeacher?.subject}
          saving={markAbsentWithCover.isPending}
          onBack={coverStep.fromMarkAbsent ? backToMarkAbsent : undefined}
          onClose={closeCover}
          onConfirm={(picks) => void confirmCover(picks)}
        />
      ) : null}
    </div>
  )
}
