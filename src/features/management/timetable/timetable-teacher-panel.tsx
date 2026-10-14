import { useMemo, useState } from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClassSection, Staff, TimetableSlot } from "@/data/types"
import { useSchoolTimetableQuery } from "@/features/management/classes/hooks/use-class-detail-queries"

import { TimetableTeacherGrid } from "./timetable-teacher-grid"

type Props = {
  teachers: Staff[]
  classes: ClassSection[]
  onEditSlotInClassView: (slot: TimetableSlot) => void
}

export function TimetableTeacherPanel({
  teachers,
  classes,
  onEditSlotInClassView,
}: Props) {
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "")
  const timetableQuery = useSchoolTimetableQuery()
  const allSlots = timetableQuery.data ?? []

  const teacherSlots = useMemo(
    () =>
      allSlots.filter(
        (slot) => slot.teacherId && slot.teacherId === teacherId
      ),
    [allSlots, teacherId]
  )

  const periodCount = useMemo(() => {
    const fromClasses = classes.map((c) => c.periodCount)
    const fromSlots = teacherSlots.map((s) => s.periodIndex)
    return Math.max(8, ...fromClasses, ...fromSlots, 1)
  }, [classes, teacherSlots])

  const teacher = teachers.find((t) => t.id === teacherId)

  if (teachers.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
        Add teachers in People to build teacher timetables.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-col gap-1.5 lg:max-w-xs">
        <Label
          htmlFor="timetable-teacher-select"
          className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]"
        >
          Teacher
        </Label>
        <Select value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger
            id="timetable-teacher-select"
            className="h-10 border-[var(--cls-border)] bg-[var(--page-wash)]/40"
          >
            <SelectValue placeholder="Select teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {teachers.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                  {person.subject ? ` · ${person.subject}` : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {teacher ? (
        <p className="text-xs text-[var(--cls-muted)]">
          Weekly load for{" "}
          <span className="font-medium text-[var(--cls-ink)]">
            {teacher.name}
          </span>
          . Click a lesson to edit it in class view.
        </p>
      ) : null}

      {timetableQuery.isLoading ? (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-24 text-center text-sm text-[var(--cls-muted)]">
          Loading timetable…
        </div>
      ) : teacherSlots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)]">
          No periods assigned yet. Use{" "}
          <span className="font-medium text-[var(--cls-ink)]">Class</span> view,
          pick a class, and use{" "}
          <span className="font-medium text-[var(--cls-ink)]">+</span> on an empty
          cell to assign subjects (optional teacher).
        </div>
      ) : (
        <TimetableTeacherGrid
          slots={teacherSlots}
          classes={classes}
          periodCount={periodCount}
          onSelectSlot={onEditSlotInClassView}
        />
      )}
    </div>
  )
}
