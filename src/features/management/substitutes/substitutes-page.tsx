import { ClipboardList, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { useSchool } from "@/data/store"
import type { TeacherAbsence } from "@/data/types"
import { StaffAvatar } from "@/features/management/teachers-assignments/staff-avatar"
import { useActor } from "@/lib/actor"
import { weekdayOf } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { classLabel, formatDate } from "@/lib/format"

import { AssignSubstitutesModal } from "./assign-substitutes-modal"
import { useSubstituteMutations } from "./hooks/use-substitute-mutations"
import {
  useSubstitutionLog,
  useTeacherAbsencesForDate,
} from "./hooks/use-teacher-absences"
import { useTeachersList } from "./hooks/use-teachers-list"
import { MarkAbsentModal } from "./mark-absent-modal"
import { SubstitutePeriodChips } from "./substitute-period-chips"
import { SubstitutionLogModal } from "./substitution-log-modal"

function groupAbsencesByTeacher(rows: TeacherAbsence[]) {
  const map = new Map<string, TeacherAbsence[]>()
  for (const row of rows) {
    const list = map.get(row.teacherId) ?? []
    list.push(row)
    map.set(row.teacherId, list)
  }
  return map
}

type AssignTarget = {
  teacherId: string
  date: string
}

export function SubstitutesPage() {
  const { state } = useSchool()
  const actor = useActor()

  const [markModalOpen, setMarkModalOpen] = useState(false)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)

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

  const { data: logData } = useSubstitutionLog()

  const { markAbsent, assign, removeCover, cancelAbsence } =
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

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of teachers) map.set(t.id, t.name)
    return (id: string) => map.get(id) ?? id
  }, [teachers])

  const assignTeacher = assignTarget
    ? teachers.find((p) => p.id === assignTarget.teacherId)
    : undefined

  function togglePeriod(period: number) {
    setPeriods((list) =>
      list.includes(period)
        ? list.filter((item) => item !== period)
        : [...list, period].sort((a, b) => a - b)
    )
  }

  async function submitAbsent() {
    const tid = Number(teacherId)
    if (!Number.isFinite(tid)) {
      toast.error("Choose a teacher.")
      return
    }
    try {
      await markAbsent.mutateAsync({
        teacherId: tid,
        date: absentDate,
        periods,
        notes: notes.trim() || undefined,
      })
      toast.success("Affected periods loaded — assign substitutes below")
      setViewDate(absentDate)
      setPeriods([])
      setNotes("")
      setMarkModalOpen(false)
      setAssignTarget({ teacherId, date: absentDate })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not mark teacher absent."
      )
    }
  }

  async function assignOne(absenceId: string, substituteId: string) {
    const aId = Number(absenceId)
    const sId = Number(substituteId)
    if (!Number.isFinite(aId) || !Number.isFinite(sId)) return
    try {
      await assign.mutateAsync({
        absenceId: aId,
        substituteTeacherId: sId,
      })
      toast.success(`${teacherNameById(substituteId)} assigned`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not assign substitute."
      )
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
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-brand)] sm:text-[28px]">
            Absent teacher &amp; substitutes
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Mark a teacher absent and assign substitutes for affected periods.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full border-[var(--cls-border)] sm:w-auto"
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
            className="w-full bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)] sm:w-auto"
            onClick={() => setMarkModalOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Mark teacher absent
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          Assign substitutes
        </p>
        <DatePicker
          value={viewDate}
          onChange={(value) => setViewDate(value || getToday())}
          placeholder="View date"
          defaultMonthKind="today"
          className="h-9 w-full border-[var(--cls-border)] bg-white text-sm sm:w-[11.5rem]"
        />
      </div>

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

      <div className="flex min-w-0 flex-col gap-4">
        {absencesLoading && !dayData ? (
          <p className="py-8 text-center text-sm text-[var(--cls-muted)]">
            Loading absences…
          </p>
        ) : null}

        {!absencesLoading && dayRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-4 py-12 text-center sm:px-6 sm:py-16">
            <p className="text-base font-medium text-[var(--cls-ink)]">
              No absences on {formatDate(viewDate)}
            </p>
            <p className="mt-1 text-sm text-[var(--cls-muted)]">
              Use <strong>Mark teacher absent</strong> to load affected periods.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full border-[var(--cls-border)] sm:w-auto"
              onClick={() => setMarkModalOpen(true)}
            >
              Mark teacher absent
            </Button>
          </div>
        ) : null}

        {dayRows.length > 0 ? (
          <>
            {pendingCount > 0 ? (
              <p className="text-sm text-[var(--cls-muted)]">
                <span className="font-semibold text-red-700">
                  {pendingCount}
                </span>{" "}
                {pendingCount === 1 ? "period" : "periods"} still need a
                substitute on {formatDate(viewDate)}.
              </p>
            ) : null}

            {Array.from(grouped.entries()).map(([tid, rows]) => {
              const person = teachers.find((s) => s.id === tid)
              const pendingForTeacher = rows.filter(
                (r) => r.status === "Pending"
              ).length
              return (
                <div
                  key={tid}
                  className="min-w-0 overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                >
                  <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] bg-[var(--page-wash)]/40 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <StaffAvatar name={teacherNameById(tid)} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--cls-ink)]">
                          {teacherNameById(tid)}
                        </p>
                        <p className="text-xs text-[var(--cls-muted)]">
                          {person?.subject ? `${person.subject} · ` : ""}
                          Absent {formatDate(viewDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                      {pendingForTeacher > 0 ? (
                        <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                          {pendingForTeacher} unassigned
                        </span>
                      ) : (
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Fully covered
                        </span>
                      )}
                      {pendingForTeacher > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          className="w-full bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)] sm:w-auto"
                          onClick={() =>
                            setAssignTarget({ teacherId: tid, date: viewDate })
                          }
                        >
                          Assign substitutes
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <ul className="divide-y divide-[var(--cls-border)]">
                    {rows.map((row) => {
                      const sub = substitutions.find(
                        (item) => item.absenceId === row.id
                      )
                      const classLine = row.classId
                        ? `${classLabel(state.classes, row.classId)} · ${row.subject ?? ""}`
                        : "Free period"

                      return (
                        <li key={row.id} className="px-4 py-4 sm:px-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                                {weekdayOf(row.date)}
                              </p>
                              <p className="text-sm font-semibold text-[var(--cls-ink)]">
                                Period {row.periodIndex}
                              </p>
                              <p className="text-xs text-[var(--cls-muted)]">
                                {classLine}
                              </p>
                              {sub ? (
                                <p className="mt-2 text-sm">
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                    Selected: {teacherNameById(sub.substituteTeacherId)}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {row.status === "Covered" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-[var(--cls-border)]"
                                  onClick={() => void handleRemoveCover(row.id)}
                                >
                                  Remove cover
                                </Button>
                              ) : null}
                              {row.status !== "Cancelled" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void handleCancelAbsence(row.id)}
                                >
                                  Cancel
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {row.status === "Pending" ? (
                            <SubstitutePeriodChips
                              absence={row}
                              assignedSubstituteId={sub?.substituteTeacherId}
                              onPick={(id) => void assignOne(row.id, id)}
                            />
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </>
        ) : null}
      </div>

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
        onDateChange={setAbsentDate}
        periods={periods}
        onTogglePeriod={togglePeriod}
        onSelectAllPeriods={() =>
          setPeriods(
            Array.from({ length: periodCount }, (_, index) => index + 1)
          )
        }
        notes={notes}
        onNotesChange={setNotes}
        periodCount={periodCount}
        teachingSlots={teachingSlots}
        onSubmit={() => void submitAbsent()}
      />

      <SubstitutionLogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        substitutions={logSubstitutions}
        classes={state.classes}
        nameOf={teacherNameById}
      />

      {assignTarget && assignTeacher ? (
        <AssignSubstitutesModal
          open={Boolean(assignTarget)}
          onOpenChange={(open) => !open && setAssignTarget(null)}
          teacherId={assignTarget.teacherId}
          teacherName={teacherNameById(assignTarget.teacherId)}
          teacherSubject={assignTeacher.subject}
          date={assignTarget.date}
          absences={dayData?.teacherAbsences ?? []}
          substitutions={substitutions}
          teachers={teachers}
          classes={state.classes}
          teacherNameById={teacherNameById}
          onAssign={(absenceId, substituteId) => {
            void assignOne(absenceId, substituteId)
            return undefined
          }}
          onDone={() => setAssignTarget(null)}
        />
      ) : null}
    </div>
  )
}
