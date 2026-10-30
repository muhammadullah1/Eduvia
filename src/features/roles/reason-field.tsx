import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { REASON_MAX, REASON_MIN } from "./reason-rules"

export function ReasonField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const hintId = `${id}-hint`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Reason for this change</Label>
      <Textarea
        id={id}
        value={value}
        maxLength={REASON_MAX}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Accountant now also records expenses"
        aria-describedby={hintId}
        required
      />
      <p id={hintId} className="text-xs text-[var(--cls-muted)]">
        Required, at least {REASON_MIN} characters. Saved in the audit log.
      </p>
    </div>
  )
}
