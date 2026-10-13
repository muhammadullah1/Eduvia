import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
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
import type { AcademicSession } from "@/data/types"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

export type EditSessionForm = {
  name: string
  start: string
  end: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: AcademicSession | null
  existingNames: string[]
  saving?: boolean
  onSubmit: (id: string, payload: EditSessionForm) => Promise<void>
}

export function EditSessionModal({
  open,
  onOpenChange,
  session,
  existingNames,
  saving = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<EditSessionForm>({
    name: "",
    start: "",
    end: "",
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !session) return
    setForm({
      name: session.name,
      start: session.start,
      end: session.end,
    })
    setError(null)
  }, [open, session])

  async function handleSubmit() {
    if (!session) return
    const name = form.name.trim()
    if (!name || !form.start || !form.end) {
      setError("Session name, start date, and end date are required.")
      return
    }
    if (form.end < form.start) {
      setError("End date must be on or after the start date.")
      return
    }
    const duplicate = existingNames.some(
      (item) => item.toLowerCase() === name.toLowerCase()
    )
    if (duplicate) {
      setError("A session with this name already exists.")
      return
    }
    setError(null)
    await onSubmit(session.id, { name, start: form.start, end: form.end })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Edit academic session
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Update session details. Past sessions stay read-only in the portal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Session name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="e.g. 2027–2028"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                Start date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={form.start}
                onChange={(value) => setForm({ ...form, start: value })}
                placeholder="Start date"
                defaultMonthKind="today"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                End date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={form.end}
                onChange={(value) => setForm({ ...form, end: value })}
                placeholder="End date"
                defaultMonthKind="today"
              />
            </div>
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
