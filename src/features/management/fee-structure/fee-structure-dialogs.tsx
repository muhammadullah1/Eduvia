import { useQuery } from "@tanstack/react-query"
import { Info } from "lucide-react"
import { useState } from "react"

import feeStructureService, {
  type AddFeeInput,
  FEE_STRUCTURE_QUERY_KEY,
  FEE_TYPE_FREQUENCY,
  FEE_TYPES,
  type FeeHistoryStatus,
  type FeeStructureFee,
  type FeeType,
} from "@/api/fees/fee-structure.service"
import { StatusChip, type StatusChipTone } from "@/components/app/status-chip"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { formatDate } from "@/lib/format"

import { amountError, errorText, formatAmount, FREQUENCY_LABEL, nextMonthStart } from "./fee-structure-rules"

const CONTENT = "max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
const HEADER = "border-b border-[var(--cls-border)] px-6 py-4 text-left"
const BRAND_BUTTON = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

// ---- Add fee type --------------------------------------------------------------

export function AddFeeDialog({
  open,
  onOpenChange,
  classLabel,
  current,
  initialType,
  saving,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classLabel: string
  current: FeeStructureFee[]
  initialType?: FeeType
  saving: boolean
  onSubmit: (input: AddFeeInput) => Promise<void>
}) {
  const [feeType, setFeeType] = useState<FeeType | "">(initialType ?? "")
  const [amount, setAmount] = useState("")
  const [effectiveFrom, setEffectiveFrom] = useState(nextMonthStart)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const existing = current.find((fee) => fee.feeType === feeType)

  async function submit() {
    const next: Record<string, string> = {}
    if (!feeType) next.feeType = "Choose a fee type."
    const amountMsg = amountError(amount)
    if (amountMsg) next.amount = amountMsg
    if (!effectiveFrom) next.effectiveFrom = "Choose the date this amount starts."
    setErrors(next)
    if (Object.keys(next).length || !feeType) return
    setServerError(null)
    try {
      await onSubmit({ feeType, amount: Number(amount), effectiveFrom })
    } catch (err) {
      setServerError(errorText(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className={CONTENT}>
        <DialogHeader className={HEADER}>
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            {existing ? `Change ${existing.feeType} amount` : "Add fee type"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Amounts are never overwritten: each change starts on its effective date and stays in history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div>
            <Label htmlFor="fee-type" className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
              Fee type <span className="text-destructive">*</span>
            </Label>
            <Select value={feeType} onValueChange={(value) => setFeeType(value as FeeType)}>
              <SelectTrigger id="fee-type" className="w-full" aria-invalid={Boolean(errors.feeType)}>
                <SelectValue placeholder="Choose a fee type" />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type} · {FREQUENCY_LABEL[FEE_TYPE_FREQUENCY[type]]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.feeType ? <p className="mt-1 text-xs text-destructive">{errors.feeType}</p> : null}
            {existing ? (
              <p className="mt-1 text-xs text-[var(--cls-muted)]">
                Currently PKR {formatAmount(existing.amount)} since {formatDate(existing.effectiveFrom)}.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fee-amount" className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                Amount (PKR) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fee-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500"
                aria-invalid={Boolean(errors.amount)}
              />
              {errors.amount ? <p className="mt-1 text-xs text-destructive">{errors.amount}</p> : null}
            </div>
            <div>
              <Label htmlFor="fee-effective" className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
                Effective date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                id="fee-effective"
                value={effectiveFrom}
                onChange={setEffectiveFrom}
                defaultMonthKind="today"
                popoverClassName="z-[100]"
                aria-invalid={Boolean(errors.effectiveFrom)}
                aria-label="Effective date"
              />
              {errors.effectiveFrom ? <p className="mt-1 text-xs text-destructive">{errors.effectiveFrom}</p> : null}
            </div>
          </div>
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              This will affect all students in <strong>{classLabel}</strong>
              {effectiveFrom ? <> for fee months starting on or after {formatDate(effectiveFrom)}</> : null}. Months
              already generated keep their amounts.
            </p>
          </div>
          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" className={BRAND_BUTTON} disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : existing ? "Save new amount" : "Add fee type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- History -------------------------------------------------------------------

const STATUS_TONE: Record<FeeHistoryStatus, StatusChipTone> = {
  Current: "success",
  Scheduled: "brand",
  Past: "neutral",
  Removed: "danger",
}

export function FeeHistoryDialog({
  classId,
  feeType,
  onClose,
}: {
  classId: number
  feeType: FeeType | null
  onClose: () => void
}) {
  const query = useQuery({
    queryKey: [FEE_STRUCTURE_QUERY_KEY, classId, "history", feeType],
    enabled: Boolean(feeType),
    queryFn: () => feeStructureService.history(classId, feeType as FeeType),
  })

  return (
    <Dialog open={Boolean(feeType)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className={CONTENT}>
        <DialogHeader className={HEADER}>
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">History — {feeType}</DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Every amount this fee has had for the class, newest first.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {query.isPending ? (
            <div className="grid gap-3" aria-label="Loading history">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : query.isError ? (
            <div className="grid justify-items-start gap-2">
              <p className="text-sm text-destructive">{errorText(query.error)}</p>
              <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          ) : !query.data.entries.length ? (
            <p className="text-sm text-[var(--cls-muted)]">No amounts recorded yet.</p>
          ) : (
            <ol className="grid gap-3">
              {query.data.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-[var(--cls-border)] px-4 py-3 data-[current=true]:border-emerald-300 data-[current=true]:bg-emerald-50/50"
                  data-current={entry.status === "Current"}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-[var(--cls-ink)] tabular-nums">
                      PKR {formatAmount(entry.amount)}
                    </p>
                    <StatusChip tone={STATUS_TONE[entry.status]}>{entry.status}</StatusChip>
                  </div>
                  <p className="mt-1 text-xs text-[var(--cls-muted)]">
                    Effective date {formatDate(entry.effectiveFrom)}
                    {entry.addedBy ? ` · added by ${entry.addedBy}` : ""}
                  </p>
                  {entry.status === "Removed" && entry.removedReason ? (
                    <p className="mt-1 text-xs text-red-700">
                      Removed{entry.removedBy ? ` by ${entry.removedBy}` : ""}: {entry.removedReason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Remove --------------------------------------------------------------------

export function RemoveFeeDialog({
  fee,
  classLabel,
  saving,
  onClose,
  onConfirm,
}: {
  fee: FeeStructureFee | null
  classLabel: string
  saving: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const text = reason.trim()
    if (text.length < 5) {
      setError("Give a reason of at least 5 characters.")
      return
    }
    setError(null)
    try {
      await onConfirm(text)
    } catch (err) {
      setError(errorText(err))
    }
  }

  return (
    <Dialog open={Boolean(fee)} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent className={CONTENT}>
        <DialogHeader className={HEADER}>
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">Remove {fee?.feeType} fee?</DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            {fee ? (
              <>
                PKR {formatAmount(fee.amount)} will no longer be charged to students in {classLabel}. Its history is
                kept.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 px-6 py-5">
          <Label htmlFor="remove-reason" className="text-sm font-medium text-[var(--cls-ink)]">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="remove-reason"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this fee being removed?"
            aria-invalid={Boolean(error)}
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-xs text-[var(--cls-muted)]">This reason will be recorded in the Audit Log.</p>
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={saving} onClick={() => void confirm()}>
            {saving ? "Removing…" : "Remove fee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
