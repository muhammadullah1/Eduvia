import { useEffect, useState } from "react"

import type { SubjectRow } from "@/api/subjects/map-subject"
import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

type Props = {
  teacher: StaffDirectoryRow | null
  subjects: SubjectRow[]
  saving?: boolean
  onClose: () => void
  onSubmit: (payload: {
    teacherId: number
    subjectId: number
    reason: string
  }) => Promise<void>
}

export function ChangeTeacherSubjectModal({
  teacher,
  subjects,
  saving = false,
  onClose,
  onSubmit,
}: Props) {
  const [subjectId, setSubjectId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!teacher) return
    setSubjectId(teacher.subjectId ?? "")
    setReason("")
    setError(null)
  }, [teacher])

  async function handleSave() {
    if (!teacher?.teacherId) return
    const sid = Number(subjectId)
    if (!Number.isFinite(sid)) {
      setError("Choose a subject.")
      return
    }
    setError(null)
    await onSubmit({
      teacherId: Number(teacher.teacherId),
      subjectId: sid,
      reason: reason.trim(),
    })
  }

  const activeSubjects = subjects.filter((s) => s.status === "Active")

  return (
    <Dialog open={Boolean(teacher)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold">
            Change subject
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? `${teacher.name} currently teaches ${teacher.subjectName}. Historical records keep their original subject.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">New subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={saving}>
              <SelectTrigger>
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
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={saving}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
