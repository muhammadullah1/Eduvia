import { Check } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field } from "@/components/app/kit"
import type { Staff, TimetableSlot } from "@/data/types"
import { WEEKDAYS } from "@/lib/academics"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import {
  isValidTime,
  type PeriodTimeMap,
  timeForPeriod,
  WEEKDAY_SHORT,
} from "@/lib/timetable-period-times"
import { cn } from "@/lib/utils"

const WEEKDAY_OPTIONS = WEEKDAYS.map((value) => ({
  value,
  short: WEEKDAY_SHORT[value] ?? value.slice(0, 3),
}))

export type SchedulePeriodPrefill = {
  day?: string
  periodIndex?: number
}

export type SchedulePeriodSubmit = {
  days: string[]
  periodIndex: number
  time: string
  subjectId: string
  teacherId: string
  room: string
}

type SubjectOption = { id: string; name: string; code: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  classLabel: string
  periodCount: number
  periodTimes: PeriodTimeMap
  roomSuggestion?: string
  subjects: SubjectOption[]
  teachers: Staff[]
  existingSlots: TimetableSlot[]
  editingSlot?: TimetableSlot | null
  prefill?: SchedulePeriodPrefill
  saving?: boolean
  onSubmit: (payload: SchedulePeriodSubmit) => Promise<void>
  onRemove?: () => Promise<void>
}

const NONE_TEACHER = "__none__"

function subjectNameById(subjects: SubjectOption[], id: string) {
  return subjects.find((s) => s.id === id)?.name ?? ""
}

function shortDayLabel(day: string) {
  return WEEKDAY_OPTIONS.find((item) => item.value === day)?.short ?? day
}

export function ClassSchedulePeriodModal({
  open,
  onOpenChange,
  classLabel,
  periodCount,
  periodTimes,
  roomSuggestion = "",
  subjects,
  teachers,
  existingSlots,
  editingSlot,
  prefill,
  saving = false,
  onSubmit,
  onRemove,
}: Props) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    () => new Set(WEEKDAYS)
  )
  const [periodIndex, setPeriodIndex] = useState("1")
  const [subjectId, setSubjectId] = useState("")
  const [teacherId, setTeacherId] = useState(NONE_TEACHER)
  const [room, setRoom] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(editingSlot)

  useEffect(() => {
    if (!open) return
    const period =
      editingSlot?.periodIndex ?? prefill?.periodIndex ?? 1
    const initialDays = editingSlot?.day
      ? [editingSlot.day]
      : prefill?.day
        ? [prefill.day]
        : [...WEEKDAYS]
    setSelectedDays(new Set(initialDays))
    setPeriodIndex(String(period))
    const matchedSubject =
      editingSlot?.subjectId ??
      subjects.find(
        (s) =>
          editingSlot?.subject &&
          s.name.toLowerCase() === editingSlot.subject.toLowerCase()
      )?.id ??
      subjects[0]?.id ??
      ""
    setSubjectId(matchedSubject)
    setTeacherId(editingSlot?.teacherId || NONE_TEACHER)
    setRoom(
      editingSlot?.room && editingSlot.room !== "—" ? editingSlot.room : ""
    )
    setError(null)
  }, [open, editingSlot, prefill, subjects])

  const subjectName = subjectNameById(subjects, subjectId)

  const eligibleTeachers = useMemo(() => {
    if (!subjectName) return teachers
    const key = subjectName.toLowerCase()
    return teachers.filter(
      (person) => person.subject.toLowerCase() === key
    )
  }, [teachers, subjectName])

  useEffect(() => {
    if (
      teacherId !== NONE_TEACHER &&
      !eligibleTeachers.some((t) => t.id === teacherId)
    ) {
      setTeacherId(NONE_TEACHER)
    }
  }, [eligibleTeachers, teacherId])

  const sortedSelectedDays = useMemo(
    () => WEEKDAYS.filter((weekday) => selectedDays.has(weekday)),
    [selectedDays]
  )

  const scheduledTime = timeForPeriod(periodTimes, Number(periodIndex) || 1)

  function toggleDay(day: string) {
    if (isEdit) {
      setSelectedDays(new Set([day]))
      return
    }
    setSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) {
        if (next.size <= 1) return next
        next.delete(day)
      } else {
        next.add(day)
      }
      return next
    })
  }

  function selectAllWeekdays() {
    setSelectedDays(new Set(WEEKDAYS))
  }

  function clearDays() {
    if (isEdit) return
    setSelectedDays(new Set([WEEKDAYS[0]]))
  }

  function validate(): string | null {
    const period = Number(periodIndex)
    if (!subjectId) return "Choose a subject."
    if (sortedSelectedDays.length === 0) return "Select at least one day."
    if (!Number.isFinite(period) || period < 1 || period > periodCount) {
      return `Period must be between 1 and ${periodCount}.`
    }
    if (!isValidTime(scheduledTime)) {
      return "Set a valid start time for this period under Admin → Timetable."
    }
    const classClashes: string[] = []
    const teacherClashes: string[] = []
    for (const day of sortedSelectedDays) {
      const clash = existingSlots.find(
        (slot) =>
          slot.day === day &&
          slot.periodIndex === period &&
          slot.id !== editingSlot?.id
      )
      if (clash) {
        classClashes.push(`${shortDayLabel(day)} (${clash.subject})`)
      }
      if (teacherId !== NONE_TEACHER) {
        const teacherClash = existingSlots.find(
          (slot) =>
            slot.teacherId === teacherId &&
            slot.day === day &&
            slot.periodIndex === period &&
            slot.id !== editingSlot?.id
        )
        if (teacherClash) {
          teacherClashes.push(shortDayLabel(day))
        }
      }
    }
    if (classClashes.length > 0) {
      return `This class already has a lesson in period ${period} on ${classClashes.join(", ")}.`
    }
    if (teacherClashes.length > 0) {
      return `That teacher is busy in period ${period} on ${teacherClashes.join(", ")}.`
    }
    return null
  }

  async function handleSubmit() {
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    await onSubmit({
      days: sortedSelectedDays,
      periodIndex: Number(periodIndex),
      time: scheduledTime,
      subjectId,
      teacherId: teacherId === NONE_TEACHER ? "" : teacherId,
      room: room.trim(),
    })
  }

  const scheduleCount = sortedSelectedDays.length
  const submitLabel = isEdit
    ? "Save changes"
    : scheduleCount > 1
      ? `Assign subject · ${scheduleCount} days`
      : "Assign subject"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            {isEdit ? "Edit period" : "Assign subject to class"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            {isEdit
              ? `Update this period on ${classLabel}'s timetable.`
              : `Choose the weekdays this subject meets at the same period on ${classLabel}'s timetable.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-5">
          <Field label="Subject" error={error && !subjectId ? error : undefined}>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} · {subject.code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Select days"
            hint={
              isEdit
                ? "Change which weekday this period is on."
                : scheduleCount > 0
                  ? `${scheduleCount} period${scheduleCount === 1 ? "" : "s"} per week at period ${periodIndex}.`
                  : undefined
            }
          >
            <div className="flex flex-col gap-2">
              {!isEdit ? (
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    className="font-medium text-[var(--cls-brand)] hover:underline"
                    onClick={selectAllWeekdays}
                  >
                    All weekdays
                  </button>
                  <span className="text-[var(--cls-border)]">|</span>
                  <button
                    type="button"
                    className="font-medium text-[var(--cls-muted)] hover:text-[var(--cls-ink)]"
                    onClick={clearDays}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map(({ value, short }) => {
                  const active = selectedDays.has(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleDay(value)}
                      className={cn(
                        "inline-flex min-w-[52px] items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-[var(--cls-brand)] bg-[var(--cls-brand)]/10 text-[var(--cls-brand)]"
                          : "border-[var(--cls-border)] bg-white text-[var(--cls-muted)] hover:border-[var(--cls-brand)]/30 hover:text-[var(--cls-ink)]"
                      )}
                    >
                      {active ? <Check className="size-3.5 shrink-0" /> : null}
                      {short}
                    </button>
                  )
                })}
              </div>
            </div>
          </Field>

          <Field label="Period">
            <Select value={periodIndex} onValueChange={setPeriodIndex}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: periodCount }, (_, i) => i + 1).map(
                    (period) => (
                      <SelectItem key={period} value={String(period)}>
                        Period {period}
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Start time"
            hint="Required — set in the period column on Admin → Timetable."
          >
            <div
              className="flex h-9 items-center rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-3 text-sm font-medium tabular-nums text-[var(--cls-ink)]"
            >
              {scheduledTime}
            </div>
          </Field>

          <Field
            label="Teacher"
            hint={
              subjectName
                ? eligibleTeachers.length === 0
                  ? "No teacher is tagged with this subject yet — you can still save without one."
                  : "Only teachers assigned to this subject are listed."
                : undefined
            }
          >
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={NONE_TEACHER}>No teacher yet</SelectItem>
                  {eligibleTeachers.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Room (optional)">
            <Input
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              placeholder={
                roomSuggestion
                  ? `e.g. ${roomSuggestion}`
                  : "e.g. C-02 (optional)"
              }
            />
          </Field>

          {error && subjectId ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <DialogFooter className={CLS_MODAL_FOOTER}>
          {isEdit && onRemove ? (
            <Button
              type="button"
              variant="outline"
              className="mr-auto text-red-600 hover:text-red-700"
              disabled={saving}
              onClick={() => void onRemove()}
            >
              Remove period
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving || subjects.length === 0}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Saving…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
