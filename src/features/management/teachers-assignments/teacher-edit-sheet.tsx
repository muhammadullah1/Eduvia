import { CalendarDays } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import type { SubjectRow } from "@/api/subjects/map-subject"
import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ClsSubjectBadge } from "@/features/management/teachers-assignments/cls-subject-badge"
import { shortenClassLabel } from "@/features/management/teachers-assignments/format-class-label"
import { StaffAvatar } from "@/features/management/teachers-assignments/staff-avatar"

type Props = {
  teacher: StaffDirectoryRow | null
  open: boolean
  subjects: SubjectRow[]
  timetableHref: string
  saving?: boolean
  onClose: () => void
  onSave: (payload: {
    teacherId: number
    subjectId: number
    reason: string
  }) => Promise<void>
}

export function TeacherEditSheet({
  teacher,
  open,
  subjects,
  timetableHref,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const [subjectId, setSubjectId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    if (!teacher) return
    setSubjectId(teacher.subjectId ?? "")
    setReason("")
    setError(null)
    setShowWarning(false)
  }, [teacher, open])

  if (!teacher) return null

  const activeSubjects = subjects.filter((subject) => subject.status === "Active")
  const initialSubjectId = teacher.subjectId ?? ""
  const hasChange = subjectId !== initialSubjectId && subjectId !== ""

  function handleSubjectChange(value: string) {
    setSubjectId(value)
    setError(null)
    if (value !== initialSubjectId && value !== "") {
      setShowWarning(true)
    } else {
      setShowWarning(false)
    }
  }

  async function handleSave() {
    if (!teacher) return
    if (!teacher.teacherId) {
      setError("Teacher profile is missing.")
      return
    }
    const sid = Number(subjectId)
    if (!Number.isFinite(sid)) {
      setError("Choose a subject.")
      return
    }
    setError(null)
    await onSave({
      teacherId: Number(teacher.teacherId),
      subjectId: sid,
      reason: reason.trim(),
    })
  }

  let saveLabel = "Save changes"
  if (saving) saveLabel = "Saving…"

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-[var(--cls-border)] p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
          <div className="flex items-center gap-3 pr-8">
            <StaffAvatar name={teacher.name} size="lg" />
            <div className="min-w-0">
              <SheetTitle className="text-lg font-semibold text-[var(--cls-ink)]">
                {teacher.name}
              </SheetTitle>
              <SheetDescription className="text-[13px]">
                {teacher.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
              Assigned subject
            </h3>
            <ClsSubjectBadge label={teacher.subjectName} />
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Subject</Label>
              <Select
                value={subjectId}
                onValueChange={handleSubjectChange}
                disabled={saving}
              >
                <SelectTrigger className="bg-[var(--page-wash)]/60">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {activeSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {showWarning ? (
              <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                <strong>Subject change:</strong> Historical marks and lesson
                records stay under the previous subject. New work uses the
                updated assignment.
              </div>
            ) : null}
            {hasChange ? (
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Reason (optional)
                </Label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  disabled={saving}
                  className="resize-none"
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </section>

          <section className="space-y-3 border-t border-[var(--cls-border)] pt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Classes taught
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[var(--cls-brand)]"
                asChild
              >
                <Link to={timetableHref}>
                  <CalendarDays data-icon="inline-start" />
                  Timetable
                </Link>
              </Button>
            </div>
            {teacher.classLabels.length === 0 ? (
              <p className="text-sm text-[var(--cls-muted)]">
                Assign this teacher on the weekly timetable (Class view, + on
                empty cells).
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {teacher.classLabels.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-[var(--cls-border)] bg-[var(--page-wash)] px-2.5 py-0.5 text-xs font-medium text-[var(--cls-ink)]"
                  >
                    {shortenClassLabel(label)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-[var(--cls-border)] px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving || !hasChange}
            onClick={() => void handleSave()}
          >
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
