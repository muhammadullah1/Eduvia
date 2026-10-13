import { classDisplayName } from "@/api/classes/map-class"
import type { SubjectRow } from "@/api/subjects/map-subject"
import type { ClassSection, Staff } from "@/data/types"
import {
  ClassSchedulePeriodModal,
} from "@/features/management/classes/class-schedule-period-modal"

import { TimetableClassGrid } from "./timetable-class-grid"
import { useClassTimetableEditor } from "./use-class-timetable-editor"

type Props = {
  classId: string
  klass: ClassSection | undefined
  subjects: SubjectRow[]
  teachers: Staff[]
  syncPortal: () => Promise<void>
  editablePeriodTimes?: boolean
}

export function ClassTimetableEditor({
  classId,
  klass,
  subjects,
  teachers,
  syncPortal,
  editablePeriodTimes = true,
}: Props) {
  const editor = useClassTimetableEditor({ classId, klass, syncPortal })
  const activeSubjects = subjects.filter((s) => s.status === "Active")

  if (!klass) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
        Select a class to view or edit its timetable.
      </div>
    )
  }

  if (editor.timetableQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          Could not load timetable
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-[var(--cls-brand)]"
          onClick={() => void editor.timetableQuery.refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  if (editor.timetableQuery.isLoading && editor.slots.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-24 text-center text-sm text-[var(--cls-muted)]">
        Loading timetable…
      </div>
    )
  }

  return (
    <>
      {editor.periodSaveError ? (
        <p className="text-xs text-red-600" role="alert">
          Period start times could not be saved. Showing last saved values.
        </p>
      ) : null}
      <TimetableClassGrid
        slots={editor.slots}
        periodCount={klass.periodCount}
        periodTimes={editor.periodTimes}
        onPeriodTimesChange={editor.handlePeriodTimesChange}
        editablePeriodTimes={editablePeriodTimes}
        onSchedulePeriod={editablePeriodTimes ? editor.openSchedule : undefined}
        onEditSlot={editablePeriodTimes ? editor.openEditSlot : undefined}
      />
      <ClassSchedulePeriodModal
        open={editor.scheduleOpen}
        onOpenChange={(open) => !open && editor.closeSchedule()}
        classLabel={classDisplayName(klass)}
        periodCount={klass.periodCount}
        periodTimes={editor.periodTimes}
        roomSuggestion={
          klass.room && klass.room !== "Unassigned" ? klass.room : undefined
        }
        subjects={activeSubjects}
        teachers={teachers.filter((person) => person.role === "Teacher")}
        existingSlots={editor.slots}
        editingSlot={editor.editingSlot}
        prefill={editor.schedulePrefill}
        saving={editor.saving}
        onSubmit={editor.handleScheduleSubmit}
        onRemove={editor.editingSlot ? editor.handleRemovePeriod : undefined}
      />
    </>
  )
}
