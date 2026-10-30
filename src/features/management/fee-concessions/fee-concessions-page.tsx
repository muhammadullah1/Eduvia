import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import concessionsService, {
  CONCESSIONS_QUERY_KEY,
  type FeeConcession,
} from "@/api/fees/concessions.service"
import { ClsEmpty, ClsPanel, ClsPanelHeader } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCan } from "@/lib/access"
import { formatDate } from "@/lib/format"

import { errorText, formatAmount, MODE_LABEL, STATUS_TONE } from "./concession-rules"

const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

/** Pending approvals queue + school reasons (assign happens on the student page). */
export function FeeConcessionsPage() {
  const queryClient = useQueryClient()
  const can = useCan()
  const canApprove = can("fees.concessions.approve")
  const canManageReasons = can("settings.fees.update")
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [newReason, setNewReason] = useState("")

  const pending = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, "pending"],
    queryFn: () => concessionsService.list({ status: "PendingApproval" }),
  })
  const reasons = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, "reasons", "all"],
    queryFn: () => concessionsService.listReasons(true),
    enabled: canManageReasons,
  })

  const approve = useMutation({
    mutationFn: (id: number) => concessionsService.approve(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      toast.success("Concession approved")
    },
    onError: (err) => toast.error(errorText(err)),
  })
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      concessionsService.reject(id, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      setRejectId(null)
      setRejectReason("")
      toast.success("Concession rejected")
    },
    onError: (err) => toast.error(errorText(err)),
  })
  const addReason = useMutation({
    mutationFn: (label: string) => concessionsService.createReason({ label }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY, "reasons"] })
      setNewReason("")
      toast.success("Reason added")
    },
    onError: (err) => toast.error(errorText(err)),
  })

  return (
    <div className="grid gap-4">
      <ClsPanel>
        <ClsPanelHeader
          title="Pending approval"
          description="Concessions above school policy wait here for a Super Admin."
        />
        <div className="px-4 py-4">
          {pending.isError ? (
            <ClsEmpty title="Couldn't load pending concessions" />
          ) : !pending.data ? (
            <div className="h-20 animate-pulse rounded-lg bg-[var(--cls-border)]/40" />
          ) : !pending.data.length ? (
            <p className="text-sm text-[var(--cls-muted)]">No concessions waiting for approval.</p>
          ) : (
            <ul className="divide-y divide-[var(--cls-border)] rounded-lg border border-[var(--cls-border)]">
              {pending.data.map((row) => (
                <PendingRow
                  key={row.id}
                  row={row}
                  canApprove={canApprove}
                  approving={approve.isPending}
                  onApprove={() => approve.mutate(row.id)}
                  onReject={() => setRejectId(row.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </ClsPanel>

      {canManageReasons ? (
        <ClsPanel>
          <ClsPanelHeader
            title="Concession reasons"
            description="School-managed list. Defaults prefill when assigning on a student."
          />
          <div className="grid gap-3 px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-xs"
                placeholder="New reason label"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                aria-label="New reason"
              />
              <Button
                type="button"
                className={BRAND}
                disabled={!newReason.trim() || addReason.isPending}
                onClick={() => addReason.mutate(newReason.trim())}
              >
                Add reason
              </Button>
            </div>
            <ul className="text-sm text-[var(--cls-ink)]">
              {(reasons.data || []).map((r) => (
                <li key={r.id} className="border-b border-[var(--cls-border)] py-2 last:border-0">
                  {r.label}
                  {!r.active ? (
                    <span className="ml-2 text-xs text-[var(--cls-muted)]">(inactive)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </ClsPanel>
      ) : null}

      {rejectId != null ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-[var(--cls-ink)]">Reject concession</h2>
            <Label className="mt-3 mb-1.5 block text-sm">Reason</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              aria-label="Rejection reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className={BRAND}
                disabled={rejectReason.trim().length < 5 || reject.isPending}
                onClick={() =>
                  reject.mutate({ id: rejectId, reason: rejectReason.trim() })
                }
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PendingRow({
  row,
  canApprove,
  approving,
  onApprove,
  onReject,
}: {
  row: FeeConcession
  canApprove: boolean
  approving: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          {row.studentName || `Student #${row.studentId}`} · {row.reasonLabel || "Concession"}
        </p>
        <p className="text-xs text-[var(--cls-muted)]">
          {MODE_LABEL[row.mode]} · {row.feeType} · from {formatDate(row.effectiveFrom)}
          {row.mode === "percent"
            ? ` · ${formatAmount(row.value)}%`
            : row.mode === "waiver"
              ? " · waiver"
              : ` · PKR ${formatAmount(row.value)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={STATUS_TONE.PendingApproval}>Pending</StatusChip>
        {canApprove ? (
          <>
            <Button type="button" size="sm" className={BRAND} disabled={approving} onClick={onApprove}>
              Approve
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onReject}>
              Reject
            </Button>
          </>
        ) : null}
      </div>
    </li>
  )
}
