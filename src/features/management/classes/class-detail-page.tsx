import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import { isDuplicateClassLabel } from "@/api/classes/map-class"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { useSchool } from "@/data/store"
import { ClassDetailHeader } from "@/features/management/classes/class-detail-header"
import { ClassDetailOverviewTab } from "@/features/management/classes/class-detail-overview-tab"
import { ClassDetailPlaceholderTab } from "@/features/management/classes/class-detail-placeholder-tab"
import { ClassDetailStudentsTab } from "@/features/management/classes/class-detail-students-tab"
import { ClassDetailSubjectsTab } from "@/features/management/classes/class-detail-subjects-tab"
import {
  CLASS_DETAIL_TABS,
  type ClassDetailTabId,
} from "@/features/management/classes/class-detail-tabs"
import { EditClassModal } from "@/features/management/classes/edit-class-modal"
import {
  invalidateClassesList,
  useClassesList,
} from "@/features/management/classes/hooks/use-classes"
import { useClassDetail } from "@/features/management/classes/use-class-detail"
import { useActor } from "@/lib/actor"
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
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const currentSession = state.sessions.find((s) => s.current)
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined

  const { data: classes = [] } = useClassesList(
    Number.isFinite(sessionNumericId) ? sessionNumericId : undefined
  )

  const klass = useMemo(
    () => classes.find((c) => c.id === classId) ?? state.classes.find((c) => c.id === classId),
    [classes, classId, state.classes]
  )

  const detail = useClassDetail(state, classId, klass)

  useEffect(() => {
    void syncPortalForRoute(actor.role, "classes")
  }, [actor.role, syncPortalForRoute])

  const tabItems = CLASS_DETAIL_TABS.map((item) => ({
    value: item.id,
    label: item.label,
    count:
      item.id === "subjects"
        ? detail.subjectCount
        : item.id === "students"
          ? detail.studentCount
          : undefined,
  }))

  const existingClassLabels = useMemo(
    () => classes.map((c) => ({ id: c.id, label: c.label })),
    [classes]
  )

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

  if (!klass) {
    return (
      <div className="flex flex-col gap-4">
        <ClassDetailHeader
          title="Class not found"
          meta="This class may have been removed or is outside the current session."
          onBack={onBack}
          onEdit={() => undefined}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ClassDetailHeader
        title={detail.displayName}
        meta={detail.metaLine}
        onBack={onBack}
        onEdit={() => setEditOpen(true)}
      />

      <ClsSubTabs
        items={tabItems}
        value={tab}
        onValueChange={(value) => onTabChange(value as ClassDetailTabId)}
        aria-label="Class detail"
      />

      {tab === "overview" ? (
        <ClassDetailOverviewTab
          studentCount={detail.studentCount}
          subjectCount={detail.subjectCount}
        />
      ) : null}
      {tab === "subjects" ? (
        <ClassDetailSubjectsTab
          className={detail.displayName}
          subjects={detail.subjects}
        />
      ) : null}
      {tab === "students" ? (
        <ClassDetailStudentsTab
          students={detail.students}
          feeMonths={state.feeMonths}
        />
      ) : null}
      {tab === "fee-structure" ? (
        <ClassDetailPlaceholderTab
          title="Fee structure"
          detail="Class fee rules will be managed in Fee Management. Monthly tuition is no longer set on the class form."
        />
      ) : null}
      {tab === "timetable" ? (
        <ClassDetailPlaceholderTab
          title="Timetable"
          detail="Open Academic Management → Timetable to view or edit periods for this class."
        />
      ) : null}

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
