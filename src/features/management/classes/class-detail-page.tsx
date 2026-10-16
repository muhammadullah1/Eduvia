import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import classesService from "@/api/classes/classes.service"
import { subjectsFromTimetableSlots } from "@/api/timetable/map-timetable"
import {
  classDisplayName,
  isDuplicateClassGradeSection,
} from "@/api/classes/map-class"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
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
  useClassStudentsQuery,
  useClassTimetableQuery,
  useFeeMonthsQuery,
} from "@/features/management/classes/hooks/use-class-detail-queries"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import {
  periodTimesFromApi,
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
  const actor = useActor()
  const { data: sessions = [] } = useSessionsList()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [periodTimes, setPeriodTimes] = useState<PeriodTimeMap>({})

  const currentSession = sessions.find((s) => s.current)
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
    () => classes.find((c) => c.id === classId),
    [classes, classId]
  )

  useEffect(() => {
    if (!klass) return
    setPeriodTimes(
      periodTimesFromApi(klass.periodStartTimes, klass.periodCount)
    )
  }, [classId, klass?.periodCount, klass?.periodStartTimes, klass])

  const needsFees = tab === "students"

  const studentsQuery = useClassStudentsQuery(classId, true)
  const timetableQuery = useClassTimetableQuery(classId, true)
  const feeMonthsQuery = useFeeMonthsQuery(needsFees)

  const students = studentsQuery.data ?? []
  const slots = timetableQuery.data ?? []
  const feeMonths = feeMonthsQuery.data ?? []
  const { data: catalogSubjects = [] } = useSubjectsList()

  const subjects = useMemo(
    () => subjectsFromTimetableSlots(slots, catalogSubjects),
    [slots, catalogSubjects]
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
    () =>
      classes.map((c) => ({
        id: c.id,
        label: c.label,
        grade: c.grade,
        section: c.section,
      })),
    [classes]
  )

  function openAdminTimetable() {
    navigate(
      `${portalPath(actor.role, "timetable")}?classId=${encodeURIComponent(classId)}`
    )
  }

  async function afterMutation(message: string) {
    await invalidateClassesList(queryClient)
    toast.success(message)
  }

  async function handleEdit(payload: {
    id: string
    grade: string
    section: string
    label: string
    room?: string | null
    periodCount: number
  }) {
    if (
      isDuplicateClassGradeSection(
        existingClassLabels,
        payload.grade,
        payload.section,
        payload.id
      )
    ) {
      toast.error("A class with this name already exists in the current session.")
      return
    }
    setSaving(true)
    try {
      await classesService.update(Number(payload.id), {
        grade: payload.grade,
        section: payload.section,
        label: payload.label,
        room: payload.room ?? null,
        periodCount: payload.periodCount,
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
              onOpenTimetable={openAdminTimetable}
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
              slots={slots}
              loading={timetableQuery.isLoading}
              error={timetableQuery.isError}
              onRetry={() => void timetableQuery.refetch()}
              periodCount={klass.periodCount}
              periodTimes={periodTimes}
              onManageTimetable={openAdminTimetable}
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
    </div>
  )
}
