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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
    room?: string | null
    periodCount: number
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
  const [room, setRoom] = useState("")
  const [periodCount, setPeriodCount] = useState("8")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !klass) return
    setGrade(klass.grade)
    setSection(klass.section)
    setRoom(klass.room === "Unassigned" ? "" : klass.room)
    setPeriodCount(String(klass.periodCount || 8))
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
    const periods = Number(periodCount) || 8
    const roomTrimmed = room.trim()
    await onSubmit({
      id: klass.id,
      grade: gradeTrimmed,
      section: sectionTrimmed,
      label,
      room: roomTrimmed || null,
      periodCount: periods,
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
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Periods per day
            </Label>
            <Select
              value={periodCount}
              onValueChange={setPeriodCount}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} periods
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-[var(--cls-muted)]">
              Controls how many rows appear on the weekly timetable for this class.
            </p>
          </div>
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
