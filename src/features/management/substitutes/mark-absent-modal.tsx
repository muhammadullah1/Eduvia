import { Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
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
import type { TimetableSlot } from "@/data/types"
import { weekdayOf } from "@/lib/academics"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

import type { SubstituteTeacherOption } from "./hooks/use-teachers-list"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teachers: SubstituteTeacherOption[]
  teachersLoading?: boolean
  teachersError?: boolean
  onRetryTeachers?: () => void
  teacherId: string
  onTeacherIdChange: (id: string) => void
  date: string
  onDateChange: (date: string) => void
  periods: number[]
  onTogglePeriod: (period: number) => void
  onSelectAllPeriods: () => void
  notes: string
  onNotesChange: (notes: string) => void
  periodCount: number
  teachingSlots: TimetableSlot[]
  onSubmit: () => void
}

export function MarkAbsentModal({
  open,
  onOpenChange,
  teachers,
  teacherId,
  onTeacherIdChange,
  date,
  onDateChange,
  periods,
  onTogglePeriod,
  onSelectAllPeriods,
  notes,
  onNotesChange,
  periodCount,
  teachingSlots,
  onSubmit,
  teachersLoading = false,
  teachersError = false,
  onRetryTeachers,
}: Props) {
  const teacher = teachers.find((person) => person.id === teacherId)
  const weekday = weekdayOf(date)
  const teacherSelectValue = teacherId || undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[480px]">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
          <DialogTitle className="text-lg text-[var(--cls-ink)]">
            Mark teacher absent
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Select the absent teacher and date. You will assign substitutes for
            each affected period next.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
            <Field label="Absent teacher">
              {teachersError ? (
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--cls-brand)]"
                  onClick={onRetryTeachers}
                >
                  Could not load teachers — retry
                </button>
              ) : (
                <Select
                  key={open ? "mark-absent-teacher-select" : "closed"}
                  value={teacherSelectValue}
                  onValueChange={onTeacherIdChange}
                  disabled={teachersLoading || teachers.length === 0}
                >
                  <SelectTrigger className="border-[var(--cls-border)] bg-[var(--page-wash)]">
                    <SelectValue
                      placeholder={
                        teachersLoading
                          ? "Loading teachers…"
                          : "Select teacher"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="z-[100] max-h-60">
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
              )}
            </Field>

            <Field label="Date">
              <DatePicker
                value={date}
                onChange={onDateChange}
                placeholder="Pick date"
                defaultMonthKind="today"
                popoverClassName="z-[100]"
                className="border-[var(--cls-border)] bg-[var(--page-wash)]"
              />
            </Field>

            {teacher ? (
              <div className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-3 py-2.5 text-xs text-[var(--cls-muted)]">
                <p>
                  Subject:{" "}
                  <span className="font-semibold text-[var(--cls-ink)]">
                    {teacher.subject || "—"}
                  </span>
                </p>
              </div>
            ) : null}

            {teacher ? (
              <Field
                label={`Periods · ${weekday}`}
                hint={
                  teachingSlots.length
                    ? "Only periods with a class on the timetable can be marked."
                    : "This teacher has no classes on this day."
                }
              >
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: periodCount }, (_, index) => index + 1).map(
                    (period) => {
                      const slot = teachingSlots.find(
                        (item) => item.periodIndex === period
                      )
                      const borderClass = slot
                        ? "border-[var(--cls-brand)]/35 bg-[var(--cls-brand)]/5"
                        : "border-[var(--cls-border)] text-[var(--cls-muted)] opacity-60"
                      return (
                        <label
                          key={period}
                          className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs ${borderClass}`}
                        >
                          <Checkbox
                            disabled={!slot}
                            aria-label={`Period ${period}`}
                            checked={periods.includes(period)}
                            onCheckedChange={() => onTogglePeriod(period)}
                          />
                          P{period}
                        </label>
                      )
                    }
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-[var(--cls-border)]"
                  disabled={teachingSlots.length === 0}
                  onClick={onSelectAllPeriods}
                >
                  Whole day
                </Button>
              </Field>
            ) : null}

            <Field label="Notes (optional)">
              <Input
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder="e.g. Medical leave"
                className="border-[var(--cls-border)] bg-[var(--page-wash)]"
              />
            </Field>
          </div>
        </div>

        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button
            type="button"
            variant="outline"
            className="border-[var(--cls-border)]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={!teacherId || periods.length === 0}
            onClick={onSubmit}
          >
            Next: assign substitutes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
