import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import attendanceReviewService, { type DailyStudent, type ReviewStatus } from "@/api/attendance/attendance-review.service"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatLongDate } from "@/lib/format"

import { type EditForm, REVIEW_STATUSES, STATUS_LABELS, validateEdit } from "./attendance-rules"

type Props = {
  student: DailyStudent | null
  date: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

/** Change one saved mark. The reason is required and is kept in the change history. */
export function EditAttendanceDialog({ student, classId, date, onOpenChange, onSaved }: Props & { classId: number }) {
  return (
    <Dialog open={student != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {student ? <EditForm key={`${student.studentId}-${student.attendanceId}`} student={student} classId={classId} date={date} onClose={() => onOpenChange(false)} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({
  student,
  classId,
  date,
  onClose,
  onSaved,
}: {
  student: DailyStudent
  classId: number
  date: string
  onClose: () => void
  onSaved: () => void
}) {
  const creating = student.attendanceId == null
  const [form, setForm] = useState<EditForm>({ status: student.status ?? "", reason: "" })
  const [touched, setTouched] = useState(false)
  const errors = validateEdit(form, student.status)
  const valid = Object.keys(errors).length === 0

  const save = useMutation({
    mutationFn: () => {
      const body = { status: form.status as ReviewStatus, reason: form.reason.trim() }
      return creating
        ? attendanceReviewService.create({ ...body, studentId: student.studentId, classId, date })
        : attendanceReviewService.edit(student.attendanceId as number, body)
    },
    onSuccess: () => {
      const label = STATUS_LABELS[form.status as ReviewStatus].toLowerCase()
      toast.success(creating ? "Attendance marked" : "Attendance updated", {
        description: creating
          ? `${student.name} is marked ${label}. The new record is in the history.`
          : `${student.name} is now ${label}. The change is in the history.`,
      })
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(creating ? "Mark not saved" : "Change not saved", { description: error instanceof Error ? error.message : undefined }),
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (valid) save.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{creating ? "Mark attendance" : "Edit attendance"}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-[var(--cls-ink)]">{student.name}</span> · {formatLongDate(date)}.{" "}
          {creating
            ? "No mark was recorded for this day. The new record is logged with your name, the time and the reason."
            : "The change is logged with your name, the time and the reason."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-status" className="text-xs font-medium text-[var(--cls-ink)]">
          Attendance status
        </Label>
        <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value as ReviewStatus }))}>
          <SelectTrigger id="edit-status" className="w-full border-[var(--cls-border)]" aria-invalid={touched && Boolean(errors.status)}>
            <SelectValue placeholder="Choose a status" />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
                {status === student.status ? " (current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {touched && errors.status ? <p className="text-xs text-red-600">{errors.status}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-reason" className="text-xs font-medium text-[var(--cls-ink)]">
          {creating ? "Reason" : "Reason for change"} <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="edit-reason"
          value={form.reason}
          maxLength={500}
          rows={3}
          onChange={(event) => setForm((f) => ({ ...f, reason: event.target.value }))}
          placeholder="e.g. Teacher marked the wrong student; confirmed present from the gate log."
          aria-invalid={touched && Boolean(errors.reason)}
        />
        {touched && errors.reason ? <p className="text-xs text-red-600">{errors.reason}</p> : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || (touched && !valid)}>
          {save.isPending ? "Saving…" : creating ? "Save mark" : "Save change"}
        </Button>
      </DialogFooter>
    </form>
  )
}
