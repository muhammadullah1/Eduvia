import { useEffect, useMemo, useState } from "react"

import { buildClassLabel } from "@/api/classes/map-class"
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
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

type FormState = {
  grade: string
  section: string
  room: string
  periodCount: string
  monthlyFee: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  klass: ClassSection | null
  sessionLabel: string
  saving?: boolean
  onSubmit: (payload: {
    id: string
    grade: string
    section: string
    label: string
    room: string
    periodCount: number
    monthlyFee: number
  }) => Promise<void>
}

export function EditClassModal({
  open,
  onOpenChange,
  klass,
  sessionLabel,
  saving = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>({
    grade: "",
    section: "Main",
    room: "",
    periodCount: "8",
    monthlyFee: "",
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !klass) return
    setForm({
      grade: klass.grade,
      section: klass.section,
      room: klass.room,
      periodCount: String(klass.periodCount),
      monthlyFee: String(klass.monthlyFee),
    })
    setError(null)
  }, [open, klass])

  const previewLabel = useMemo(
    () => buildClassLabel(form.grade, form.section),
    [form.grade, form.section]
  )

  async function handleSubmit() {
    if (!klass) return
    if (!form.grade.trim()) {
      setError("Class name is required.")
      return
    }
    const periodCount = Number(form.periodCount)
    if (!Number.isFinite(periodCount) || periodCount < 1 || periodCount > 16) {
      setError("Periods per day must be between 1 and 16.")
      return
    }
    const monthlyFee = Number(form.monthlyFee)
    if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
      setError("Monthly tuition must be zero or greater.")
      return
    }
    setError(null)
    await onSubmit({
      id: klass.id,
      grade: form.grade.trim(),
      section: form.section.trim() || "Main",
      label: previewLabel,
      room: form.room.trim() || "Unassigned",
      periodCount,
      monthlyFee,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Edit class
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Session {sessionLabel}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Class name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              placeholder="e.g. Class 1, Nursery"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Section
            </Label>
            <Input
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder="Main (optional)"
            />
            <p className="mt-1 text-xs text-[var(--cls-muted)]">
              Display:{" "}
              <span className="font-medium text-[var(--cls-ink)]">
                {previewLabel || "—"}
              </span>
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                Room
              </Label>
              <Input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="B-12"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                Periods / day
              </Label>
              <Input
                type="number"
                min={1}
                max={16}
                inputMode="numeric"
                value={form.periodCount}
                onChange={(e) =>
                  setForm({ ...form, periodCount: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Monthly tuition (PKR)
            </Label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.monthlyFee}
              onChange={(e) =>
                setForm({ ...form, monthlyFee: e.target.value })
              }
            />
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
