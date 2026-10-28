import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BadgePercent, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import concessionsService, {
  CONCESSIONS_QUERY_KEY,
  type CreateConcessionInput,
} from "@/api/fees/concessions.service"
import { ClsPanel, ClsPanelHeader } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MonthPicker } from "@/components/ui/month-picker"
import { useActor } from "@/lib/actor"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"

import {
  CATEGORY_LABEL,
  errorText,
  formatAmount,
  MODE_LABEL,
  STATUS_TONE,
} from "../fee-concessions/concession-rules"
import { RequestConcessionDialog } from "../fee-concessions/request-concession-dialog"

const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

/** Student-scoped concessions list + optional fee breakdown preview. */
export function StudentConcessionsPanel({ studentId }: { studentId: number }) {
  const { role } = useActor()
  const queryClient = useQueryClient()
  const canView = can(role, "fees.concessions.view")
  const canRequest = can(role, "fees.concessions.request")
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const list = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, "student", studentId],
    queryFn: () => concessionsService.listForStudent(studentId),
    enabled: canView,
  })
  const breakdown = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, "breakdown", studentId, month],
    queryFn: () => concessionsService.breakdown(studentId, month, "Tuition"),
    enabled: canView && Boolean(month),
  })

  const create = useMutation({
    mutationFn: (input: CreateConcessionInput) => concessionsService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      setOpen(false)
      toast.success("Concession draft saved")
    },
    onError: (err) => toast.error(errorText(err)),
  })

  if (!canView) return null

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Fee concessions"
        description="Approved concessions apply to newly generated bills only"
        actions={
          canRequest ? (
            <Button size="sm" className={BRAND} onClick={() => { create.reset(); setOpen(true) }}>
              <Plus data-icon="inline-start" /> Request
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 px-4 py-4">
        {list.isError ? (
          <p className="text-sm text-destructive">Could not load concessions.</p>
        ) : !list.data ? (
          <div className="h-16 animate-pulse rounded-lg bg-[var(--cls-border)]/40" />
        ) : !list.data.length ? (
          <p className="text-sm text-[var(--cls-muted)]">No concessions on file for this student.</p>
        ) : (
          <ul className="divide-y divide-[var(--cls-border)] rounded-lg border border-[var(--cls-border)]">
            {list.data.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--cls-ink)]">
                    {MODE_LABEL[row.mode]} · {CATEGORY_LABEL[row.category]}
                  </p>
                  <p className="text-xs text-[var(--cls-muted)]">
                    {row.feeTypes.join(", ")} · from {formatDate(row.effectiveFrom)}
                    {row.mode === "percent"
                      ? ` · ${formatAmount(row.value)}%`
                      : row.mode === "waiver"
                        ? " · full waiver"
                        : ` · PKR ${formatAmount(row.value)}`}
                  </p>
                </div>
                <StatusChip tone={STATUS_TONE[row.status]}>
                  {row.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
                </StatusChip>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/40 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--cls-ink)]">
            <BadgePercent className="size-4 text-[var(--cls-brand)]" aria-hidden />
            Tuition breakdown preview
          </div>
          <div className="mb-3 max-w-[14rem]">
            <Label className="mb-1.5 block text-xs font-medium text-[var(--cls-muted)]">Month</Label>
            <MonthPicker
              value={month}
              onChange={setMonth}
              monthsBack={24}
              monthsAhead={6}
              aria-label="Breakdown month"
              className="w-full border-[var(--cls-border)] bg-white"
            />
          </div>
          {breakdown.isError ? (
            <p className="text-xs text-destructive">Could not load breakdown.</p>
          ) : breakdown.data ? (
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[var(--cls-muted)]">Base</dt>
                <dd className="font-medium tabular-nums">PKR {formatAmount(breakdown.data.base)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--cls-muted)]">Discount</dt>
                <dd className="font-medium tabular-nums">PKR {formatAmount(breakdown.data.discount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--cls-muted)]">Net</dt>
                <dd className="font-medium tabular-nums">PKR {formatAmount(breakdown.data.net)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--cls-muted)]">Conflict</dt>
                <dd className="font-medium">{breakdown.data.conflict ? "Yes — resolve first" : "No"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-[var(--cls-muted)]">Loading…</p>
          )}
        </div>
      </div>

      {canRequest ? (
        <RequestConcessionDialog
          open={open}
          onOpenChange={setOpen}
          defaultStudentId={studentId}
          saving={create.isPending}
          onSubmit={async (input) => {
            await create.mutateAsync(input)
          }}
        />
      ) : null}
    </ClsPanel>
  )
}
