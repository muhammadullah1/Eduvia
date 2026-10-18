import { BookOpen } from "lucide-react"
import { useEffect, useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"

type Props = {
  staff: StaffDirectoryRow
  subjects: SubjectRow[]
  saving?: boolean
  onSave: (payload: {
    teacherId: number
    subjectId: number
    reason: string
  }) => Promise<void>
}

export function StaffDetailSubjectTab({
  staff,
  subjects,
  saving = false,
  onSave,
}: Props) {
  const [subjectId, setSubjectId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSubjectId(staff.subjectId ?? "")
    setReason("")
    setError(null)
  }, [staff.id, staff.subjectId])

  const activeSubjects = subjects.filter((subject) => subject.status === "Active")

  const initialSubjectId = staff.subjectId ?? ""
  const hasChange = subjectId !== initialSubjectId && subjectId !== ""

  async function handleSave() {
    if (!staff.teacherId) {
      setError("This account is not linked to a teacher profile.")
      return
    }
    const sid = Number(subjectId)
    if (!Number.isFinite(sid)) {
      setError("Choose a subject.")
      return
    }
    setError(null)
    await onSave({
      teacherId: Number(staff.teacherId),
      subjectId: sid,
      reason: reason.trim(),
    })
  }

  let saveLabel = "Save changes"
  if (saving) saveLabel = "Saving…"

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[var(--cls-border)] bg-gradient-to-br from-[var(--cls-brand)]/[0.06] to-transparent p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--cls-brand)] shadow-sm ring-1 ring-[var(--cls-border)]">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--cls-muted)]">
                Active subject
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--cls-ink)]">
                {staff.subjectName}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cls-muted)]">
                This is the subject shown on reports and used when this teacher
                is placed on the timetable. Changing it does not remove existing
                timetable slots—you may need to update those separately.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="text-sm font-semibold text-[var(--cls-ink)]">
          Update subject
        </h2>
        <p className="mt-1 text-xs text-[var(--cls-muted)]">
          Pick a subject from your school catalog.
        </p>

        <div className="mt-4 grid gap-4">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Subject</Label>
            <Select
              value={subjectId}
              onValueChange={setSubjectId}
              disabled={saving}
            >
              <SelectTrigger className="h-10 bg-[var(--page-wash)]/60">
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
                placeholder="e.g. department reshuffle"
                className="resize-none"
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="button"
            className="w-full bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving || !hasChange}
            onClick={() => void handleSave()}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
