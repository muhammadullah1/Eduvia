import { Pencil, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSchool } from "@/data/store"
import type { TestSchedule } from "@/data/types"
import { useActor } from "@/lib/actor"
import { WEEKDAYS } from "@/lib/academics"
import { classLabel } from "@/lib/format"
import { can } from "@/lib/permissions"
import { cn } from "@/lib/utils"

const SCHOOL_DAYS = WEEKDAYS.slice(0, 6)

type Draft = {
  subject: string
  weekdays: string[]
  max: string
  classIds: string[]
  /** Schedule rows loaded into this edit, including other days for the same classes. */
  lockedIds: string[]
}

const EMPTY_DRAFT: Draft = {
  subject: "",
  weekdays: [],
  max: "20",
  classIds: [],
  lockedIds: [],
}

function passMark(max: number, percent: number) {
  if (max <= 0) return 0
  return Math.ceil((max * percent) / 100)
}

export function DailyTestSchedulePage() {
  const { state, saveTestSchedule, removeTestSchedule } = useSchool()
  const actor = useActor()
  const canManage = can(actor.role, "tests.schedule")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)

  const classes = state.classes.filter((row) => row.status !== "Archived")
  const schedules = state.testSchedules.filter((row) => row.active)
  const passPercent = state.settings.dailyTestRules.passPercent

  function taughtDays(subject: string, classId?: string) {
    return SCHOOL_DAYS.filter((day) =>
      state.slots.some(
        (slot) =>
          slot.subject === subject &&
          slot.day === day &&
          (classId == null || slot.classId === classId)
      )
    )
  }

  function classesFor(subject: string, weekdays: string[]) {
    if (!subject || weekdays.length === 0) return []
    const wanted = new Set(weekdays)
    const ids = new Set(
      state.slots
        .filter((slot) => slot.subject === subject && wanted.has(slot.day))
        .map((slot) => slot.classId)
    )
    return classes.filter((klass) => ids.has(klass.id))
  }

  const eligibleClasses = classesFor(draft.subject, draft.weekdays)

  const byDay = useMemo(() => {
    const map = new Map<string, Map<string, TestSchedule[]>>()
    for (const day of SCHOOL_DAYS) map.set(day, new Map())
    for (const row of schedules) {
      const day = map.get(row.weekday) ?? new Map<string, TestSchedule[]>()
      const list = day.get(row.subject) ?? []
      list.push(row)
      day.set(row.subject, list)
      map.set(row.weekday, day)
    }
    return map
  }, [schedules])

  const notes = useMemo(() => {
    const lines: string[] = []
    for (const classId of draft.classIds) {
      const days = taughtDays(draft.subject, classId).filter((day) =>
        draft.weekdays.includes(day)
      )
      for (const day of days) {
        const others = schedules.filter(
          (row) =>
            row.classId === classId &&
            row.weekday === day &&
            row.subject !== draft.subject
        )
        if (others.length) {
          lines.push(
            `${classLabel(classes, classId)} already has ${others.map((row) => row.subject).join(", ")} on ${day}. Both tests will run.`
          )
        }
      }
    }
    return lines
  }, [classes, draft, schedules, state.slots])

  function openCreate() {
    setDraft(EMPTY_DRAFT)
    setOpen(true)
  }

  function openEdit(_weekday: string, subject: string, rows: TestSchedule[]) {
    const classIds = rows.map((row) => row.classId)
    const related = schedules.filter(
      (row) => row.subject === subject && classIds.includes(row.classId)
    )
    const weekdays = SCHOOL_DAYS.filter((day) =>
      related.some((row) => row.weekday === day)
    )
    const allowed = new Set(classesFor(subject, weekdays).map((klass) => klass.id))
    setDraft({
      subject,
      weekdays,
      max: String(rows[0]?.max || 20),
      classIds: classIds.filter((id) => allowed.has(id)),
      lockedIds: related.map((row) => row.id),
    })
    setOpen(true)
  }

  function setWeekdays(weekdays: string[]) {
    setDraft((current) => {
      const allowed = new Set(
        classesFor(current.subject, weekdays).map((klass) => klass.id)
      )
      return {
        ...current,
        weekdays,
        classIds: current.classIds.filter((id) => allowed.has(id)),
      }
    })
  }

  function toggleClass(id: string) {
    setDraft((current) => ({
      ...current,
      classIds: current.classIds.includes(id)
        ? current.classIds.filter((item) => item !== id)
        : [...current.classIds, id],
    }))
  }

  async function save() {
    if (saving) return
    const max = Number(draft.max)
    if (!draft.subject) {
      toast.error("Choose a subject.")
      return
    }
    if (!draft.weekdays.length) {
      toast.error("Choose at least one day.")
      return
    }
    const allowed = new Set(eligibleClasses.map((klass) => klass.id))
    if (!draft.classIds.length || draft.classIds.some((id) => !allowed.has(id))) {
      toast.error(
        eligibleClasses.length
          ? "Choose a class that has this subject on a selected day."
          : `No class has ${draft.subject} on the selected days.`
      )
      return
    }
    if (!Number.isFinite(max) || max <= 0) {
      toast.error("Total marks must be at least 1.")
      return
    }

    const kept = new Set<string>()
    setSaving(true)
    try {
    for (const classId of draft.classIds) {
      const days = taughtDays(draft.subject, classId).filter((day) =>
        draft.weekdays.includes(day)
      )
      for (const weekday of days) {
        const existing = schedules.find(
          (row) =>
            row.classId === classId &&
            row.subject === draft.subject &&
            row.weekday === weekday
        )
        if (existing) kept.add(existing.id)
        const message = await saveTestSchedule(
          {
            classId,
            subject: draft.subject,
            weekday,
            periodIndex: existing?.periodIndex || 1,
            max,
          },
          actor
        )
        if (message) {
          toast.error(message)
          return
        }
      }
    }

    for (const id of draft.lockedIds) {
      if (kept.has(id)) continue
      const message = await removeTestSchedule(id, actor)
      if (message) {
        toast.error(message)
        return
      }
    }

    const dayLabel = draft.weekdays
      .slice()
      .sort(
        (a, b) =>
          SCHOOL_DAYS.indexOf(a as (typeof SCHOOL_DAYS)[number]) -
          SCHOOL_DAYS.indexOf(b as (typeof SCHOOL_DAYS)[number])
      )
      .map((day) => day.slice(0, 3))
      .join(", ")
    toast.success(`${draft.subject} is set for ${dayLabel}.`)
    setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const marks = Number(draft.max) || 0

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-brand)] sm:text-[28px]">
            Daily Test Schedule
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--cls-muted)]">
            Set a subject on every day it should be tested. A class can still
            have more than one subject on the same day.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            className="h-9 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={openCreate}
          >
            <Plus data-icon="inline-start" />
            Add schedule
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-[var(--cls-muted)]">
        Students pass at {passPercent}% of the test. More than{" "}
        {state.settings.dailyTestRules.maxFailsPerMonth} failed test
        {state.settings.dailyTestRules.maxFailsPerMonth === 1 ? "" : "s"} in a
        subject during the month is flagged.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {SCHOOL_DAYS.map((day) => {
          const groups = [...(byDay.get(day)?.entries() ?? [])].sort((a, b) =>
            a[0].localeCompare(b[0])
          )
          const count = groups.length
          return (
            <section
              key={day}
              className="flex min-h-44 flex-col rounded-xl border border-[var(--cls-border)] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--cls-ink)]">
                  {day}
                </h2>
                <p
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    count > 1
                      ? "text-amber-700"
                      : "text-[var(--cls-muted)]"
                  )}
                >
                  {count === 0 ? "Clear" : count === 1 ? "1 test" : `${count} tests`}
                </p>
              </div>

              {count === 0 ? (
                <p className="mt-3 flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--cls-border)] px-3 py-6 text-center text-xs text-[var(--cls-muted)]">
                  No test
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {groups.map(([subject, rows]) => {
                    const max = rows[0]?.max || 20
                    return (
                      <li
                        key={subject}
                        className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/40 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--cls-ink)]">
                            {subject}
                          </p>
                          {canManage ? (
                            <button
                              type="button"
                              className="rounded-md p-1 text-[var(--cls-muted)] hover:bg-white hover:text-[var(--cls-ink)]"
                              aria-label={`Edit ${subject} on ${day}`}
                              onClick={() => openEdit(day, subject, rows)}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-[var(--cls-muted)]">
                          {max} marks · pass {passMark(max, passPercent)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rows.map((row) => (
                            <span
                              key={row.id}
                              className="rounded-full border border-[var(--cls-border)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--cls-ink)]"
                            >
                              {classLabel(classes, row.classId)}
                            </span>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft.lockedIds.length ? "Edit test schedule" : "Add test schedule"}
            </DialogTitle>
            <DialogDescription>
              Choose one day or every day this subject is taught. A class only
              appears when that subject is on its timetable.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 block text-xs">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select
                value={draft.subject || undefined}
                onValueChange={(subject) =>
                  setDraft((current) => {
                    const allowed = new Set(
                      classesFor(subject, current.weekdays).map((klass) => klass.id)
                    )
                    return {
                      ...current,
                      subject,
                      classIds: current.classIds.filter((id) => allowed.has(id)),
                    }
                  })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {state.subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs">Test days</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--cls-brand)]"
                  onClick={() =>
                    setWeekdays(
                      draft.subject ? taughtDays(draft.subject) : [...SCHOOL_DAYS]
                    )
                  }
                >
                  All taught days
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {SCHOOL_DAYS.map((day) => {
                  const selected = draft.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      className={cn(
                        "h-9 rounded-md border text-sm",
                        selected
                          ? "border-[var(--cls-brand)] bg-[var(--cls-brand)] text-white"
                          : "border-[var(--cls-border)] bg-white text-[var(--cls-ink)]"
                      )}
                      onClick={() =>
                        setWeekdays(
                          selected
                            ? draft.weekdays.filter((item) => item !== day)
                            : [...draft.weekdays, day]
                        )
                      }
                    >
                      {day.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">Total marks</Label>
              <Input
                inputMode="numeric"
                value={draft.max}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    max: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
              <p className="mt-1.5 text-xs text-[var(--cls-muted)]">
                Pass is {passMark(marks, passPercent)} of {marks || 0} (
                {passPercent}%). Typical tests are 10–20 marks.
              </p>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">
                Apply to classes <span className="text-destructive">*</span>
              </Label>
              {!draft.subject ? (
                <p className="text-xs text-[var(--cls-muted)]">
                  Choose a subject to see the classes that take it.
                </p>
              ) : draft.weekdays.length === 0 ? (
                <p className="text-xs text-[var(--cls-muted)]">
                  Choose the days this subject should be tested.
                </p>
              ) : eligibleClasses.length === 0 ? (
                <p className="text-xs text-[var(--cls-muted)]">
                  No class has {draft.subject} on the selected days.
                </p>
              ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {eligibleClasses.map((klass) => {
                  const checked = draft.classIds.includes(klass.id)
                  const days = taughtDays(draft.subject, klass.id)
                    .filter((day) => draft.weekdays.includes(day))
                    .map((day) => day.slice(0, 3))
                    .join(", ")
                  return (
                    <label
                      key={klass.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm",
                        checked
                          ? "border-[var(--cls-brand)] bg-[color-mix(in_srgb,var(--cls-brand)_8%,white)]"
                          : "border-[var(--cls-border)] bg-white"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleClass(klass.id)}
                      />
                      <span className="min-w-0 flex-1 truncate">{klass.label}</span>
                      <span className="shrink-0 text-xs text-[var(--cls-muted)]">
                        {days}
                      </span>
                    </label>
                  )
                })}
              </div>
              )}
            </div>

            {notes.length ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                {notes.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : draft.lockedIds.length
                  ? "Save schedule"
                  : "Create schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
