import { Loader2, type LucideIcon } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"

import { Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** Category chip colours (Figma): fee income green, donation amber, grant blue, misc grey. */
const CHIP: Record<string, string> = {
  FeeIncome: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Donation: "border-amber-200 bg-amber-50 text-amber-800",
  Grant: "border-blue-200 bg-blue-50 text-blue-700",
  Misc: "border-slate-200 bg-slate-100 text-slate-700",
  StaffSalary: "border-violet-200 bg-violet-50 text-violet-700",
  Utilities: "border-red-200 bg-red-50 text-red-700",
  Supplies: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Maintenance: "border-orange-200 bg-orange-50 text-orange-700",
  Other: "border-slate-200 bg-slate-100 text-slate-700",
}


export function CategoryChip({ category, label }: { category: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CHIP[category] ?? CHIP.Other
      )}
    >
      {label}
    </span>
  )
}

/** Small summary tile: the Figma "Total Income (Sep 2026) / PKR 743,600" card. */
export function TotalTile({
  label,
  value,
  hint,
  tone = "neutral",
  testId,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  tone?: "income" | "expense" | "neutral"
  testId?: string
  icon?: LucideIcon
}) {
  const valueColor =
    tone === "income"
      ? "text-emerald-700"
      : tone === "expense"
        ? "text-red-700"
        : "text-[var(--cls-ink)]"

  const iconBg =
    tone === "income"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "expense"
        ? "bg-red-50 text-red-700"
        : "bg-[var(--page-wash)] text-[var(--cls-brand)]"

  return (
    <div
      data-testid={testId}
      className="flex min-w-0 min-h-[102px] items-start justify-between gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--cls-muted)]">{label}</p>
        <p className={cn("mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums", valueColor)}>
          {value}
        </p>
        {hint ? <p className="mt-1 truncate text-xs text-[var(--cls-muted)]">{hint}</p> : null}
      </div>
      {Icon ? (
        <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-xl", iconBg)}>
          <Icon className="size-5" />
        </span>
      ) : null}
    </div>
  )
}

/** Delete with a reason (stored with the soft-deleted entry and in the audit log). */
export function DeleteReasonDialog({
  open,
  title,
  description,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: ReactNode
  busy: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setReason("")
      setTouched(false)
    }
  }, [open])
  const error = reason.trim().length < 3 ? "Give a reason (at least 3 characters)." : undefined
  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>
        <Field label="Reason for deleting" error={touched ? error : undefined}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Entered twice"
            maxLength={500}
            aria-label="Reason for deleting"
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setTouched(true)
              if (!error) onConfirm(reason.trim())
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : null}
            {busy ? "Deleting…" : "Delete entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
