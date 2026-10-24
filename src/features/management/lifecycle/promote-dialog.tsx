import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import lifecycleService from "@/api/students/lifecycle.service"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { getToday } from "@/lib/dates"

import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import type { LifecycleStudent } from "./change-status-dialog"
import { useRefreshLifecycle } from "./lifecycle-hooks"
import { ClassPicker, FormField, SessionPicker } from "./lifecycle-shared"

type Props = {
  student: (LifecycleStudent & { classId?: number | null; admittedOn?: string | null }) | null
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}

/** Move one Active student to another class (SRS p15 Promotion). Whole classes use Enrollment & Promotion. */
export function PromoteDialog({ student, onOpenChange, onDone }: Props) {
  return (
    <Dialog open={student != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {student ? (
          <PromoteBody key={student.id} student={student} onClose={() => onOpenChange(false)} onDone={onDone} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PromoteBody({
  student,
  onClose,
  onDone,
}: {
  student: NonNullable<Props["student"]>
  onClose: () => void
  onDone?: () => void
}) {
  const today = getToday()
  const refresh = useRefreshLifecycle()
  const [date, setDate] = useState(today)
  const [pickedSession, setPickedSession] = useState("")
  const [classId, setClassId] = useState("")
  const [touched, setTouched] = useState(false)

  const sessions = useSessionsList().data ?? []
  const sessionId = pickedSession || (sessions.find((s) => s.current)?.id ?? "")
  const classesQuery = useClassesList(sessionId ? Number(sessionId) : undefined)
  const classes = (classesQuery.data ?? []).filter(
    (klass) => klass.status !== "Archived" && klass.id !== String(student.classId ?? "")
  )
  const active = student.status === "Active"

  const error = !active
    ? "Only active students can be promoted. Reactivate the student first."
    : !sessionId || !classId
      ? "Pick the session and class."
      : !date
        ? "Pick the effective date."
        : date > today
          ? "The effective date cannot be in the future."
          : student.admittedOn && date < student.admittedOn.slice(0, 10)
            ? "The effective date cannot be before admission."
            : null

  const mutation = useMutation({
    mutationFn: () => lifecycleService.promote(student.id, { classId: Number(classId), sessionId: Number(sessionId), date }),
    onSuccess: async () => {
      toast.success(`${student.name} promoted`)
      await refresh()
      onDone?.()
      onClose()
    },
    onError: (err) =>
      toast.error("Nothing was changed", { description: err instanceof Error ? err.message : undefined }),
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Promote student</DialogTitle>
        <DialogDescription>
          {student.name} · {student.classLabel ?? "No class"}. The move is recorded in the history; seats are checked
          against the class capacity.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="promote-session" label="Session">
          <SessionPicker
            id="promote-session"
            value={sessionId}
            onChange={(value) => {
              setPickedSession(value)
              setClassId("")
            }}
            sessions={sessions}
          />
        </FormField>
        <FormField id="promote-class" label="To class">
          <ClassPicker
            id="promote-class"
            value={classId}
            onChange={setClassId}
            classes={classes}
            disabled={!active || !sessionId || classesQuery.isLoading}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField id="promote-date" label="Effective date">
            <DatePicker
              id="promote-date"
              value={date}
              onChange={setDate}
              defaultMonthKind="today"
              popoverClassName="z-[100]"
              fromDate={student.admittedOn?.slice(0, 10) ?? undefined}
              maxDate={today}
            />
          </FormField>
        </div>
      </div>
      {(touched || !active) && error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          disabled={!active || mutation.isPending}
          onClick={() => {
            setTouched(true)
            if (!error) mutation.mutate()
          }}
        >
          {mutation.isPending ? <Spinner /> : null}
          Promote
        </Button>
      </DialogFooter>
    </>
  )
}
