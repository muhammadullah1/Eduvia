import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import adjustmentsService from "@/api/fees/adjustments.service"
import type { LedgerBill } from "@/api/fees/generation.service"
import { LEDGER_QUERY_KEY } from "@/api/fees/generation.service"
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
import { Textarea } from "@/components/ui/textarea"
import { ApiHttpError } from "@/lib/api"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"

import { formatPkr } from "./generation-rules"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bill: LedgerBill | null
  studentId: number
}

/** SA-only: request + approve an adjustment that changes collectible without rewriting the original net. */
export function AdjustBillDialog({ open, onOpenChange, bill, studentId }: Props) {
  const queryClient = useQueryClient()
  const [delta, setDelta] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const run = useMutation({
    mutationFn: async () => {
      if (!bill) return
      const value = Number(delta)
      if (!Number.isFinite(value) || value === 0) throw new Error("Enter a non-zero adjustment amount.")
      if (reason.trim().length < 5) throw new Error("Reason needs at least 5 characters.")
      const requested = await adjustmentsService.request(bill.id, {
        deltaCollectible: value,
        reason: reason.trim(),
      })
      return adjustmentsService.approve(requested.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [LEDGER_QUERY_KEY, studentId] })
      toast.success("Bill adjustment approved")
      onOpenChange(false)
      setDelta("")
      setReason("")
      setError(null)
    },
    onError: (err) => {
      const message =
        err instanceof ApiHttpError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Adjustment failed"
      setError(message)
      toast.error(message)
    },
  })

  if (!bill) return null
  const proposed = Number(bill.due) + (Number(delta) || 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !run.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4">
          <DialogTitle>Adjust {bill.feeType} bill</DialogTitle>
          <DialogDescription>
            Original net stays PKR {formatPkr(bill.originalNet ?? bill.due)}. Collectible changes by your delta.
            Cannot go below the amount already paid (PKR {formatPkr(bill.paid)}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/50 px-3 py-2 text-xs text-[var(--cls-muted)]">
            Current collectible PKR {formatPkr(bill.due)}
            {bill.adjustmentTotal ? ` · prior adjustments ${formatPkr(bill.adjustmentTotal)}` : ""}
            {Number(delta) ? ` · after this: PKR ${formatPkr(proposed)}` : ""}
          </div>
          <div>
            <Label className="mb-1.5 block">Delta (PKR)</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 200 or -100"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Reason</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button variant="outline" disabled={run.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={run.isPending}
            onClick={() => run.mutate()}
          >
            {run.isPending ? "Saving…" : "Approve adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
