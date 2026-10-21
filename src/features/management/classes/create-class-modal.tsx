import { useEffect, useState } from "react"

import {
  buildClassLabel,
  isDuplicateClassGradeSection,
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
import { ClassSectionField } from "@/features/management/classes/class-section-field"
import {
  DEFAULT_PERIOD_COUNT,
  PeriodCountField,
} from "@/features/management/classes/period-count-field"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionLabel: string
  existingClasses: { id: string; label: string; grade: string; section: string }[]
  saving?: boolean
  onSubmit: (payload: {
    grade: string
    section: string
    label: string
    room?: string | null
    periodCount: number
  }) => Promise<void>
}

export function CreateClassModal({
  open,
  onOpenChange,
  sessionLabel,
  existingClasses,
  saving = false,
  onSubmit,
}: Props) {
  const [grade, setGrade] = useState("")
  const [section, setSection] = useState("Main")
  const [room, setRoom] = useState("")
  const [periodCount, setPeriodCount] = useState(String(DEFAULT_PERIOD_COUNT))
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [classError, setClassError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setGrade("")
    setSection("Main")
    setRoom("")
    setPeriodCount(String(DEFAULT_PERIOD_COUNT))
    setGradeError(null)
    setSectionError(null)
    setClassError(null)
  }, [open])

  async function handleSubmit() {
    const gradeTrimmed = grade.trim()
    setGradeError(null)
    setSectionError(null)
    setClassError(null)

    if (!gradeTrimmed) {
      setGradeError("Class name is required.")
      return
    }
    if (!section.trim()) {
      setSectionError("Enter a section name or choose Standard.")
      return
    }
    const sectionTrimmed = section.trim()
    const label = buildClassLabel(gradeTrimmed, sectionTrimmed)
    if (
      isDuplicateClassGradeSection(
        existingClasses,
        gradeTrimmed,
        sectionTrimmed
      )
    ) {
      setClassError(
        "A class with this name already exists in the current session."
      )
      return
    }
    const roomTrimmed = room.trim()
    try {
      await onSubmit({
        grade: gradeTrimmed,
        section: sectionTrimmed,
        label,
        room: roomTrimmed || null,
        periodCount: Number(periodCount) || DEFAULT_PERIOD_COUNT,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create class."
      if (message.toLowerCase().includes("class")) {
        setClassError(message)
      } else {
        setClassError(message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Add new class
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Session {sessionLabel}. Tuition is configured in Fee Management.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Class name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                if (gradeError) setGradeError(null)
                if (classError) setClassError(null)
              }}
              placeholder="e.g. Class 1, Nursery, Grade 7"
              aria-invalid={Boolean(gradeError)}
            />
            {gradeError ? (
              <p className="mt-1 text-sm text-destructive">{gradeError}</p>
            ) : null}
          </div>
          <div>
            <ClassSectionField
              grade={grade}
              section={section}
              onSectionChange={(value) => {
                setSection(value)
                if (sectionError) setSectionError(null)
                if (classError) setClassError(null)
              }}
              disabled={saving}
            />
            {sectionError ? (
              <p className="mt-1 text-sm text-destructive">{sectionError}</p>
            ) : null}
            {classError ? (
              <p className="mt-2 text-sm text-destructive">{classError}</p>
            ) : null}
          </div>
          <PeriodCountField
            value={periodCount}
            onChange={setPeriodCount}
            disabled={saving}
          />
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Home room <span className="text-[var(--cls-muted)]">(optional)</span>
            </Label>
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Room 12"
              disabled={saving}
            />
          </div>
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
            {saving ? "Creating…" : "Create class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
