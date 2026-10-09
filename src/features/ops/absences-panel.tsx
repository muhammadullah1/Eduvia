import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, Field, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { type TeacherAbsence } from "@/data/types"
import { availableSubstitutes, busyReason, weekdayOf } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { classLabel, formatDate } from "@/lib/format"

function useStaffName() {
  const { state } = useSchool()
  return (id: string) =>
    state.staff.find((person) => person.id === id)?.name ?? id
}

// ---- absences & substitutes (UR-03 / §5) --------------------------------------------

export function AbsencesPanel() {
  const {
    state,
    markTeacherAbsent,
    assignSubstitute,
    removeSubstitute,
    cancelAbsence,
  } = useSchool()
  const actor = useActor()
  const nameOf = useStaffName()
  const teachers = state.staff.filter((person) => person.role === "Teacher")
  const [teacherId, setTeacherId] = useState("")
  const [date, setDate] = useState(getToday)
  const [periods, setPeriods] = useState<number[]>([])
  const [notes, setNotes] = useState("")
  const [viewDate, setViewDate] = useState(getToday)
  const [picking, setPicking] = useState<TeacherAbsence | null>(null)
  const teacher = teachers.find((person) => person.id === teacherId)
  const periodCount = Math.max(
    ...state.classes
      .filter((klass) => teacher?.classIds.includes(klass.id))
      .map((klass) => klass.periodCount),
    8
  )
  const teaching = state.slots.filter(
    (slot) => slot.teacherId === teacherId && slot.day === weekdayOf(date)
  )
  const dayRows = state.teacherAbsences
    .filter((row) => row.date === viewDate)
    .sort(
      (a, b) =>
        nameOf(a.teacherId).localeCompare(nameOf(b.teacherId)) ||
        a.periodIndex - b.periodIndex
    )
  const current = picking
    ? (state.teacherAbsences.find((row) => row.id === picking.id) ?? null)
    : null
  const free = current
    ? availableSubstitutes(
        current,
        state.staff,
        state.slots,
        state.substitutions,
        state.teacherAbsences
      )
    : []
  const busy = current
    ? teachers.filter(
        (person) => person.id !== current.teacherId && !free.includes(person)
      )
    : []

  function toggle(period: number) {
    setPeriods((list) =>
      list.includes(period)
        ? list.filter((item) => item !== period)
        : [...list, period].sort((a, b) => a - b)
    )
  }

  function submit() {
    const message = markTeacherAbsent(
      { teacherId, date, periods, notes },
      actor
    )
    if (message) toast.error(message)
    else {
      toast.success("Absence recorded — assign cover for each teaching period")
      setViewDate(date)
      setPeriods([])
      setNotes("")
    }
  }

  function assign(substituteId: string) {
    if (!current) return
    const message = assignSubstitute(current.id, substituteId, actor)
    if (message) toast.error(message)
    else {
      toast.success(`${nameOf(substituteId)} assigned`)
      setPicking(null)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Mark teacher absent</CardTitle>
          <CardDescription>
            Choose the periods; each teaching period gets its own cover
            decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Teacher">
            <Select
              value={teacherId}
              onValueChange={(value) => {
                setTeacherId(value)
                setPeriods([])
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {teachers.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} · {person.subject}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          {teacher ? (
            <Field
              label={`Periods · ${weekdayOf(date)}`}
              hint="Highlighted periods have a class in the timetable."
            >
              <div className="grid grid-cols-4 gap-2">
                {Array.from(
                  { length: periodCount },
                  (_, index) => index + 1
                ).map((period) => {
                  const slot = teaching.find(
                    (item) => item.periodIndex === period
                  )
                  return (
                    <label
                      key={period}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${slot ? "border-[var(--primary-color)]/40 bg-[var(--secondary-color)]/50" : ""}`}
                    >
                      <Checkbox
                        checked={periods.includes(period)}
                        onCheckedChange={() => toggle(period)}
                      />
                      P{period}
                    </label>
                  )
                })}
              </div>
            </Field>
          ) : null}
          {teacher ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPeriods(
                  Array.from({ length: periodCount }, (_, index) => index + 1)
                )
              }
            >
              Whole day
            </Button>
          ) : null}
          <Field label="Notes">
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Medical leave"
            />
          </Field>
        </CardContent>
        <CardFooter>
          <Button disabled={!teacherId || !periods.length} onClick={submit}>
            Mark absent
          </Button>
        </CardFooter>
      </Card>

      <div className="grid content-start gap-5">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Absences · {formatDate(viewDate)}</CardTitle>
              <CardDescription>
                Free teachers are found from the timetable and today’s other
                substitutions.
              </CardDescription>
            </div>
            <Input
              type="date"
              className="sm:w-44"
              value={viewDate}
              onChange={(event) =>
                setViewDate(event.target.value || getToday())
              }
            />
          </CardHeader>
          <CardContent>
            {dayRows.length === 0 ? (
              <EmptyState
                title="No absences"
                detail="Nobody is marked absent on this date."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Class · subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Substitute</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayRows.map((row) => {
                    const sub = state.substitutions.find(
                      (item) => item.absenceId === row.id
                    )
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {nameOf(row.teacherId)}
                        </TableCell>
                        <TableCell>P{row.periodIndex}</TableCell>
                        <TableCell>
                          {row.classId
                            ? `${classLabel(state.classes, row.classId)} · ${row.subject}`
                            : "Free period"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            value={
                              row.status === "NoClass" ? "No class" : row.status
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {sub ? (
                            <span>
                              {nameOf(sub.substituteTeacherId)}
                              <span className="block text-xs text-muted-foreground">
                                by {sub.authorizedBy}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {row.status === "Pending" ? (
                              <Button size="sm" onClick={() => setPicking(row)}>
                                Find cover
                              </Button>
                            ) : null}
                            {row.status === "Covered" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const message = removeSubstitute(
                                    row.id,
                                    actor
                                  )
                                  if (message) toast.error(message)
                                  else toast.success("Substitute removed")
                                }}
                              >
                                Remove cover
                              </Button>
                            ) : null}
                            {row.status !== "Cancelled" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const message = cancelAbsence(row.id, actor)
                                  if (message) toast.error(message)
                                  else toast.success("Absence cancelled")
                                }}
                              >
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Substitution register</CardTitle>
            <CardDescription>
              Date, period, original teacher, substitute, class, subject and who
              authorised it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state.substitutions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No substitutions yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Class · subject</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Substitute</TableHead>
                    <TableHead>Authorised by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.substitutions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell>P{row.periodIndex}</TableCell>
                      <TableCell>
                        {classLabel(state.classes, row.classId)} · {row.subject}
                      </TableCell>
                      <TableCell>{nameOf(row.originalTeacherId)}</TableCell>
                      <TableCell className="font-medium">
                        {nameOf(row.substituteTeacherId)}
                      </TableCell>
                      <TableCell>{row.authorizedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(current)}
        onOpenChange={(value) => !value && setPicking(null)}
      >
        <DialogContent>
          {current ? (
            <>
              <DialogHeader>
                <DialogTitle>Cover · period {current.periodIndex}</DialogTitle>
                <DialogDescription>
                  {classLabel(state.classes, current.classId ?? "")} ·{" "}
                  {current.subject} · {weekdayOf(current.date)}{" "}
                  {formatDate(current.date)} · for {nameOf(current.teacherId)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Free at this period
                </p>
                {free.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No teacher is free in this period.
                  </p>
                ) : (
                  free.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{person.name}</span> ·{" "}
                        {person.subject}
                      </span>
                      <Button size="sm" onClick={() => assign(person.id)}>
                        Assign
                      </Button>
                    </div>
                  ))
                )}
                {busy.length ? (
                  <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Busy — the system rejects these
                  </p>
                ) : null}
                {busy.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span>
                      {person.name} ·{" "}
                      {busyReason(
                        person.id,
                        current.date,
                        current.periodIndex,
                        state.slots,
                        state.substitutions.filter(
                          (row) => row.absenceId !== current.id
                        ),
                        state.teacherAbsences
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => assign(person.id)}
                    >
                      Try
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
