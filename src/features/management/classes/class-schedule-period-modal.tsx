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
}

type SubjectOption = { id: string; name: string; code: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  classId: string
  classLabel: string
  periodCount: number
  periodTimes: PeriodTimeMap
  subjects: SubjectOption[]
  teachers: Staff[]
  schoolSlots: TimetableSlot[]
  editingSlot?: TimetableSlot | null
  prefill?: SchedulePeriodPrefill
  saving?: boolean
  onSubmit: (payload: SchedulePeriodSubmit) => Promise<void>
  onRemove?: () => Promise<void>
}

function subjectNameById(subjects: SubjectOption[], id: string) {
  return subjects.find((s) => s.id === id)?.name ?? ""
}

export function ClassSchedulePeriodModal({
  open,
  onOpenChange,
  classId,
  classLabel,
  periodCount,
  periodTimes,
  subjects,
  teachers,
  schoolSlots,
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
  const [teacherId, setTeacherId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [blockedDays, setBlockedDays] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

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
    setTeacherId(editingSlot?.teacherId || "")
    setFormError(null)
    setBlockedDays([])
    setNotice(null)
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
    if (teacherId && !eligibleTeachers.some((t) => t.id === teacherId)) {
      setTeacherId("")
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

  function sameClock(slotTime: string, scheduled: string) {
    return slotTime.slice(0, 5) === scheduled.slice(0, 5)
  }

  function findConflicts() {
    const period = Number(periodIndex)
    if (!subjectId) return { formError: "Choose a subject.", blockedDays: [] as string[], notice: null }
    if (!teacherId) {
      return { formError: "Teacher is required.", blockedDays: [] as string[], notice: null }
    }
    if (sortedSelectedDays.length === 0) {
      return { formError: "Select at least one day.", blockedDays: [] as string[], notice: null }
    }
    if (!Number.isFinite(period) || period < 1 || period > periodCount) {
      return {
        formError: `Period must be between 1 and ${periodCount}.`,
        blockedDays: [] as string[],
        notice: null,
      }
    }
    if (!isValidTime(scheduledTime)) {
      return {
        formError: "Set a valid start time for this period on the timetable.",
        blockedDays: [] as string[],
        notice: null,
      }
    }

    const taken = new Set<string>()
    const subjectsTaken = new Set<string>()
    let ownClass = false
    const teacherName =
      teachers.find((person) => person.id === teacherId)?.name ?? "This teacher"

    for (const day of sortedSelectedDays) {
      for (const slot of schoolSlots) {
        if (slot.id === editingSlot?.id || slot.day !== day) continue
        const samePeriod = slot.periodIndex === period
        const sameTime = sameClock(slot.time, scheduledTime)
        if (slot.classId === classId && (samePeriod || sameTime)) {
          taken.add(day)
          ownClass = true
          continue
        }
        if (slot.teacherId === teacherId && sameTime) {
          taken.add(day)
          subjectsTaken.add(slot.subject || "another subject")
        }
      }
    }

    const blocked = WEEKDAYS.filter((day) => taken.has(day))
    if (blocked.length === 0) {
      return { formError: null, blockedDays: [] as string[], notice: null }
    }

    const subjectsBusy = [...subjectsTaken]
    const notice = subjectsBusy.length
      ? `${teacherName} is already teaching ${subjectsBusy.length === 1 ? subjectsBusy[0] : "another subject"} at ${scheduledTime}. The red days are taken.`
      : ownClass
        ? `${classLabel} already has a lesson at ${scheduledTime}. The red days are taken.`
        : null

    return { formError: null, blockedDays: blocked, notice }
  }

  async function handleSubmit() {
    const found = findConflicts()
    setFormError(found.formError)
    setBlockedDays(found.blockedDays)
    setNotice(
      found.notice ??
        (found.formError &&
        found.formError !== "Teacher is required." &&
        found.formError !== "Choose a subject."
          ? found.formError
          : null)
    )
    if (found.formError || found.blockedDays.length > 0) return
    try {
      await onSubmit({
        days: sortedSelectedDays,
        periodIndex: Number(periodIndex),
        time: scheduledTime,
        subjectId,
        teacherId,
      })
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save this period.")
    }
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
          <Field label="Subject" error={!subjectId ? formError ?? undefined : undefined}>
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
                  const blocked = blockedDays.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleDay(value)}
                      className={cn(
                        "inline-flex min-w-[52px] items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        blocked && active
                          ? "border-red-300 bg-red-50 text-red-800"
                          : active
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
              {notice ? (
                <p className="text-sm text-red-700" role="alert">
                  {notice}
                </p>
              ) : null}
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
            error={formError === "Teacher is required." ? formError : undefined}
          >
            <Select value={teacherId || undefined} onValueChange={setTeacherId}>
              <SelectTrigger
                aria-invalid={formError === "Teacher is required." || undefined}
                className={formError === "Teacher is required." ? "border-destructive" : undefined}
              >
                <SelectValue placeholder="Choose teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {eligibleTeachers.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
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
