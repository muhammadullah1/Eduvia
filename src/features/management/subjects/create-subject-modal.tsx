import { useEffect, useState } from "react"

import {
  isDuplicateSubjectCode,
  normalizeSubjectCode,
} from "@/api/subjects/map-subject"
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
import { Label } from "@/components/ui/label"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSubjects: { id: string; code: string }[]
  saving?: boolean
  onSubmit: (payload: { name: string; code: string }) => Promise<void>
}

export function CreateSubjectModal({
  open,
  onOpenChange,
  existingSubjects,
  saving = false,
  onSubmit,
}: Props) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName("")
    setCode("")
    setError(null)
  }, [open])

  async function handleSubmit() {
    const nameTrimmed = name.trim()
    const codeTrimmed = normalizeSubjectCode(code)
    if (!nameTrimmed) {
      setError("Subject name is required.")
      return
    }
    if (!codeTrimmed) {
      setError("Subject code is required.")
      return
    }
    if (isDuplicateSubjectCode(existingSubjects, codeTrimmed)) {
      setError("A subject with this code already exists.")
      return
    }
    setError(null)
    await onSubmit({ name: nameTrimmed, code: codeTrimmed })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Add subject
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Subjects are shared across the school catalog and timetable.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Subject name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. English, Mathematics"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ENG"
              className="font-mono uppercase"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Adding…" : "Add subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
