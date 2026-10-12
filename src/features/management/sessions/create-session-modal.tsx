import { useEffect, useState } from "react"

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

export type CreateSessionForm = {
  name: string
  start: string
  end: string
}

const EMPTY: CreateSessionForm = {
  name: "",
  start: "",
  end: "",
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingNames: string[]
  saving?: boolean
  onSubmit: (payload: CreateSessionForm) => Promise<void>
}

export function CreateSessionModal({
  open,
  onOpenChange,
  existingNames,
  saving = false,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CreateSessionForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    setError(null)
  }, [open])

  async function handleSubmit() {
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
    await onSubmit({ name, start: form.start, end: form.end })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Create academic session
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Sessions organise admissions, fees, exams, and results.
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
            <p className="mt-1 text-xs text-[var(--cls-muted)]">
              Use the format &quot;YYYY–YYYY&quot; for consistency.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                Start date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.start}
                onChange={(event) =>
                  setForm({ ...form, start: event.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                End date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.end}
                onChange={(event) =>
                  setForm({ ...form, end: event.target.value })
                }
              />
            </div>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
            <strong>Note:</strong> New sessions start as upcoming. Activate a
            session before it receives new admissions, fees, or exams. Activating
            replaces the current session.
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 border-t border-[var(--cls-border)] bg-[var(--page-wash)]/50 px-6 py-4 sm:justify-end">
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
            {saving ? "Creating…" : "Create session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
