import { useEffect, useMemo, useState } from "react"

import {
  buildClassLabel,
  isDuplicateClassLabel,
} from "@/api/classes/map-class"
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
import type { ClassSection } from "@/data/types"
import { ClassSectionField } from "@/features/management/classes/class-section-field"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  klass: ClassSection | null
  sessionLabel: string
  existingClasses: { id: string; label: string }[]
  saving?: boolean
  onSubmit: (payload: {
    id: string
    grade: string
    section: string
    label: string
  }) => Promise<void>
}

export function EditClassModal({
  open,
  onOpenChange,
  klass,
  sessionLabel,
  existingClasses,
  saving = false,
  onSubmit,
}: Props) {
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("Main")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !klass) return
    setGrade(klass.grade)
    setSection(klass.section)
    setError(null)
  }, [open, klass])

  async function handleSubmit() {
    if (!klass) return
    const gradeTrimmed = grade.trim()
    if (!gradeTrimmed) {
      setError("Class name is required.")
      return
    }
    if (!section.trim()) {
      setError("Enter a section name or choose Standard.")
      return
    }
    const sectionTrimmed = section.trim()
    const label = buildClassLabel(gradeTrimmed, sectionTrimmed)
    if (isDuplicateClassLabel(existingClasses, label, klass.id)) {
      setError("A class with this name already exists in the current session.")
      return
    }
    setError(null)
    await onSubmit({
      id: klass.id,
      grade: gradeTrimmed,
      section: sectionTrimmed,
      label,
    })
  }

  const previewLabel = useMemo(
    () => buildClassLabel(grade, section),
    [grade, section]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Edit class
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Session {sessionLabel} · {previewLabel || klass?.label}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Class name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. Class 1, Nursery"
            />
          </div>
          <ClassSectionField
            grade={grade}
            section={section}
            onSectionChange={setSection}
            disabled={saving}
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
