import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import classesService from "@/api/classes/classes.service"
import { subjectsFromTimetableSlots } from "@/api/timetable/map-timetable"
import { classDisplayName, isDuplicateClassLabel } from "@/api/classes/map-class"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { useSchool } from "@/data/store"
import { ClassDetailHeader } from "@/features/management/classes/class-detail-header"
import { ClassDetailStudentsTab } from "@/features/management/classes/class-detail-students-tab"
import { ClassDetailSubjectsTab } from "@/features/management/classes/class-detail-subjects-tab"
import { ClassDetailSummaryCard } from "@/features/management/classes/class-detail-summary-card"
import { ClassDetailTimetableTab } from "@/features/management/classes/class-detail-timetable-tab"
import {
  CLASS_DETAIL_TABS,
  type ClassDetailTabId,
} from "@/features/management/classes/class-detail-tabs"
import { EditClassModal } from "@/features/management/classes/edit-class-modal"
import {
  invalidateClassesList,
  useClassesList,
} from "@/features/management/classes/hooks/use-classes"
import {
  invalidateClassTimetable,
  useClassStudentsQuery,
  useClassTimetableQuery,
  useFeeMonthsQuery,
} from "@/features/management/classes/hooks/use-class-detail-queries"
import {
  ClassSchedulePeriodModal,
  type SchedulePeriodPrefill,
  type SchedulePeriodSubmit,
} from "@/features/management/classes/class-schedule-period-modal"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import timetableService from "@/api/timetable/timetable.service"
import type { TimetableSlot } from "@/data/types"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import {
  loadClassPeriodTimes,
  type PeriodTimeMap,
} from "@/lib/timetable-period-times"
import { toast } from "@/lib/toast"

type Props = {
  classId: string
  tab: ClassDetailTabId
  onTabChange: (tab: ClassDetailTabId) => void
  onBack: () => void
}

export function ClassDetailPage({
  classId,
  tab,
  onTabChange,
  onBack,
}: Props) {
  const { state, syncPortalForRoute } = useSchool()
  const actor = useActor()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [schedulePrefill, setSchedulePrefill] = useState<
    SchedulePeriodPrefill | undefined
  >()
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeMap>({})

  const currentSession = state.sessions.find((s) => s.current)
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined

  const {
    data: classes = [],
    isLoading: classesLoading,
    isError: classesError,
    refetch: refetchClasses,
  } = useClassesList(
    Number.isFinite(sessionNumericId) ? sessionNumericId : undefined
  )

  const klass = useMemo(
    () =>
      classes.find((c) => c.id === classId) ??
      state.classes.find((c) => c.id === classId),
    [classes, classId, state.classes]
  )

  useEffect(() => {
    if (!klass) return
    setPeriodTimes(loadClassPeriodTimes(classId, klass.periodCount))
  }, [classId, klass?.periodCount, klass])

  const needsFees = tab === "students"

  const studentsQuery = useClassStudentsQuery(classId, true)
  const timetableQuery = useClassTimetableQuery(classId, true)
  const feeMonthsQuery = useFeeMonthsQuery(needsFees)
  const { data: catalogSubjects = [] } = useSubjectsList()

  const students = studentsQuery.data ?? []
  const slots = timetableQuery.data ?? []
  const feeMonths = feeMonthsQuery.data ?? []

  const subjects = useMemo(
    () => subjectsFromTimetableSlots(slots, state.subjects),
    [slots, state.subjects]
  )

  const studentCount = students.length
  const subjectCount = subjects.length

  const tabItems = CLASS_DETAIL_TABS.map((item) => ({
    value: item.id,
    label: item.label,
    count:
      item.id === "subjects"
        ? subjectCount
        : item.id === "students"
          ? studentCount
          : undefined,
  }))

  const existingClassLabels = useMemo(
    () => classes.map((c) => ({ id: c.id, label: c.label })),
    [classes]
  )

  const activeSubjects = useMemo(
    () => catalogSubjects.filter((s) => s.status === "Active"),
    [catalogSubjects]
  )

  const teachers = useMemo(
    () => state.staff.filter((person) => person.role === "Teacher"),
    [state.staff]
  )

  function openSchedule(prefill?: SchedulePeriodPrefill) {
    setEditingSlot(null)
    setSchedulePrefill(prefill)
    setScheduleOpen(true)
  }

  function closeSchedule() {
    setScheduleOpen(false)
    setEditingSlot(null)
    setSchedulePrefill(undefined)
  }

  async function refreshTimetable(message: string) {
    await invalidateClassTimetable(queryClient, classId)
    await syncPortalForRoute(actor.role, "classes")
    toast.success(message)
  }

  async function handleScheduleSubmit(payload: SchedulePeriodSubmit) {
    const classNumericId = Number(classId)
    const subjectNumericId = Number(payload.subjectId)
    if (!Number.isFinite(classNumericId) || !Number.isFinite(subjectNumericId)) {
      toast.error("Invalid class or subject.")
      return
    }
    if (payload.days.length === 0) {
      toast.error("Select at least one day.")
      return
    }
    setSaving(true)
    try {
      const shared = {
        fkClassId: classNumericId,
        time: payload.time,
        periodIndex: payload.periodIndex,
        fkSubjectId: subjectNumericId,
        fkTeacherId: payload.teacherId
          ? Number(payload.teacherId)
          : null,
        room: payload.room || null,
      }
      if (editingSlot) {
        const slotId = Number(editingSlot.id)
        await timetableService.update(slotId, {
          ...shared,
          day: payload.days[0],
        })
        await refreshTimetable("Period updated")
      } else {
        const failures: string[] = []
        let created = 0
        for (const day of payload.days) {
          try {
            await timetableService.create({ ...shared, day })
            created += 1
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Could not schedule period."
            failures.push(`${day}: ${msg}`)
          }
        }
        if (created === 0) {
          toast.error(failures[0] ?? "Could not schedule subject.")
          return
        }
        await refreshTimetable(
          created === payload.days.length
            ? `Subject assigned on ${created} day${created === 1 ? "" : "s"}`
            : `Assigned on ${created} of ${payload.days.length} days`
        )
        if (failures.length > 0) {
          toast.error(failures.slice(0, 2).join(" · "))
        }
      }
      closeSchedule()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save timetable period."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRemovePeriod() {
    if (!editingSlot) return
    const slotId = Number(editingSlot.id)
    if (!Number.isFinite(slotId)) return
    setSaving(true)
    try {
      await timetableService.remove(slotId)
      await refreshTimetable("Period removed")
      closeSchedule()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove period."
      )
    } finally {
      setSaving(false)
    }
  }

  async function afterMutation(message: string) {
    await invalidateClassesList(queryClient)
    await syncPortalForRoute(actor.role, "classes")
    toast.success(message)
  }

  async function handleEdit(payload: {
    id: string
    grade: string
    section: string
    label: string
  }) {
    if (isDuplicateClassLabel(existingClassLabels, payload.label, payload.id)) {
      toast.error("A class with this name already exists in the current session.")
      return
    }
    setSaving(true)
    try {
      await classesService.update(Number(payload.id), {
        grade: payload.grade,
        section: payload.section,
        label: payload.label,
      })
      await afterMutation("Class updated")
      setEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update class.")
    } finally {
      setSaving(false)
    }
  }

  if (classesLoading && !klass) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
        Loading class…
      </div>
    )
  }

  if (!klass) {
    return (
      <div className="flex flex-col gap-4">
        <ClassDetailHeader
          title="Class not found"
          onBack={onBack}
          onEdit={() => undefined}
        />
        {classesError ? (
          <button
            type="button"
            className="text-sm font-semibold text-[var(--cls-brand)]"
            onClick={() => void refetchClasses()}
          >
            Retry loading classes
          </button>
        ) : null}
      </div>
    )
  }

  const status = klass.status === "Archived" ? "Archived" : "Active"

  return (
    <div className="flex flex-col gap-5">
      <ClassDetailHeader
        title={classDisplayName(klass)}
        meta={
          [
            currentSession ? `Session ${currentSession.name}` : null,
            klass.room && klass.room !== "Unassigned" ? klass.room : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        status={status}
        onBack={onBack}
        onEdit={() => setEditOpen(true)}
      />

      <ClassDetailSummaryCard
        klass={klass}
        sessionName={currentSession?.name}
        studentCount={studentCount}
        subjectCount={subjectCount}
      />

      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-4 pt-4 pb-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <ClsSubTabs
          items={tabItems}
          value={tab}
          onValueChange={(value) => onTabChange(value as ClassDetailTabId)}
          variant="segmented"
          aria-label="Class detail"
        />

        <div className="mt-5">
          {tab === "subjects" ? (
            <ClassDetailSubjectsTab
              className={classDisplayName(klass)}
              subjects={subjects}
              loading={timetableQuery.isLoading}
              error={timetableQuery.isError}
              onRetry={() => void timetableQuery.refetch()}
              onSchedulePeriod={() => openSchedule()}
              onOpenTimetable={() =>
                navigate(
                  `${portalPath(actor.role, "timetable")}?classId=${encodeURIComponent(classId)}`
                )
              }
            />
          ) : null}
          {tab === "students" ? (
            <ClassDetailStudentsTab
              students={students}
              feeMonths={feeMonths}
              loading={studentsQuery.isLoading}
              error={studentsQuery.isError}
              onRetry={() => void studentsQuery.refetch()}
            />
          ) : null}
          {tab === "timetable" ? (
            <ClassDetailTimetableTab
              classId={classId}
              slots={slots}
              loading={timetableQuery.isLoading}
              error={timetableQuery.isError}
              onRetry={() => void timetableQuery.refetch()}
              periodCount={klass.periodCount}
              periodTimes={periodTimes}
              onManageTimetable={() =>
                navigate(
                  `${portalPath(actor.role, "timetable")}?classId=${encodeURIComponent(classId)}`
                )
              }
            />
          ) : null}
        </div>
      </div>

      <EditClassModal
        open={editOpen}
        onOpenChange={setEditOpen}
        klass={klass}
        sessionLabel={currentSession?.name ?? "—"}
        existingClasses={existingClassLabels}
        saving={saving}
        onSubmit={handleEdit}
      />

      <ClassSchedulePeriodModal
        open={scheduleOpen}
        onOpenChange={(open) => !open && closeSchedule()}
        classLabel={classDisplayName(klass)}
        periodCount={klass.periodCount}
        periodTimes={periodTimes}
        roomSuggestion={
          klass.room && klass.room !== "Unassigned" ? klass.room : undefined
        }
        subjects={activeSubjects}
        teachers={teachers}
        existingSlots={slots}
        editingSlot={editingSlot}
        prefill={schedulePrefill}
        saving={saving}
        onSubmit={handleScheduleSubmit}
        onRemove={editingSlot ? handleRemovePeriod : undefined}
      />
    </div>
  )
}
