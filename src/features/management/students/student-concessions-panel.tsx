import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BadgePercent, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import concessionsService, {
  type ConcessionMode,
  CONCESSIONS_QUERY_KEY,
  type CreateConcessionInput,
  type FeeConcession,
} from "@/api/fees/concessions.service"
import { ClsPanel, ClsPanelHeader } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MonthPicker } from "@/components/ui/month-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCan } from "@/lib/access"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { formatDate } from "@/lib/format"

import { errorText, formatAmount, MODE_LABEL, STATUS_TONE } from "../fee-concessions/concession-rules"

const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

/** Student-scoped fee concession: one active Approved row per fee type. */
export function StudentConcessionsPanel({ studentId }: { studentId: number }) {
  const queryClient = useQueryClient()
  const can = useCan()
  const canView = can("fees.concessions.read") || can("fees.concessions.request")
  const canRequest = can("fees.concessions.request")
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
  const reasons = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, "reasons"],
    queryFn: () => concessionsService.listReasons(),
    enabled: open,
  })
  const siblings = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, "siblings", studentId],
    queryFn: () => concessionsService.siblingSuggestion(studentId),
    enabled: open,
  })

  const create = useMutation({
    mutationFn: (body: CreateConcessionInput) => concessionsService.create(body),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      setOpen(false)
      toast.success(
        row.status === "PendingApproval"
          ? "Concession submitted for approval"
          : "Concession applied"
      )
    },
    onError: (err) => toast.error(errorText(err)),
  })

  const active = useMemo(
    () => (list.data || []).filter((r) => r.status === "Approved"),
    [list.data]
  )

  if (!canView) return null

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Fee concession"
        description="One active concession per fee type. Editing creates a new version and keeps history."
        actions={
          canRequest ? (
            <Button type="button" size="sm" className={BRAND} onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" /> Set concession
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
              <ConcessionRow key={row.id} row={row} />
            ))}
          </ul>
        )}

        {active.length ? (
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
              breakdown.data.base == null ? (
                <p className="text-xs text-amber-800">
                  Tuition is not configured for this class. Set fees under Fee Structure.
                </p>
              ) : (
                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-[var(--cls-muted)]">Base</dt>
                    <dd className="font-medium tabular-nums">PKR {formatAmount(breakdown.data.base)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--cls-muted)]">Discount</dt>
                    <dd className="font-medium tabular-nums">
                      PKR {formatAmount(breakdown.data.discount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--cls-muted)]">Net</dt>
                    <dd className="font-medium tabular-nums">PKR {formatAmount(breakdown.data.net)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--cls-muted)]">Reason</dt>
                    <dd className="font-medium">
                      {breakdown.data.snapshot.reasonLabel || "—"}
                    </dd>
                  </div>
                </dl>
              )
            ) : (
              <p className="text-xs text-[var(--cls-muted)]">Loading…</p>
            )}
          </div>
        ) : null}
      </div>

      {open ? (
        <AssignDialog
          studentId={studentId}
          reasons={reasons.data || []}
          suggestSibling={Boolean(siblings.data?.suggestSibling)}
          saving={create.isPending}
          onClose={() => setOpen(false)}
          onSubmit={(body) => create.mutateAsync(body)}
        />
      ) : null}
    </ClsPanel>
  )
}

function ConcessionRow({ row }: { row: FeeConcession }) {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          {row.reasonLabel || "Concession"} · {MODE_LABEL[row.mode]}
        </p>
        <p className="text-xs text-[var(--cls-muted)]">
          {row.feeType} · from {formatDate(row.effectiveFrom)}
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
  )
}

function AssignDialog({
  studentId,
  reasons,
  suggestSibling,
  saving,
  onClose,
  onSubmit,
}: {
  studentId: number
  reasons: Array<{
    id: number
    label: string
    defaultMode: ConcessionMode | null
    defaultValue: number | null
  }>
  suggestSibling: boolean
  saving: boolean
  onClose: () => void
  onSubmit: (body: CreateConcessionInput) => Promise<unknown>
}) {
  const siblingReason = reasons.find((r) => r.label.toLowerCase() === "sibling")
  const [reasonId, setReasonId] = useState(
    suggestSibling && siblingReason ? String(siblingReason.id) : ""
  )
  const [mode, setMode] = useState<ConcessionMode>("percent")
  const [value, setValue] = useState("10")
  const [notes, setNotes] = useState("")

  function applyReason(id: string) {
    setReasonId(id)
    const reason = reasons.find((r) => String(r.id) === id)
    if (!reason) return
    if (reason.defaultMode) setMode(reason.defaultMode)
    if (reason.defaultValue != null) setValue(String(reason.defaultValue))
  }

  async function submit() {
    if (!reasonId) {
      toast.error("Pick a reason")
      return
    }
    await onSubmit({
      studentId,
      reasonId: Number(reasonId),
      mode,
      value: mode === "waiver" ? 0 : Number(value),
      feeType: "Tuition",
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !saving && !v && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Set fee concession
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          {suggestSibling ? (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
              This student shares a parent account with another student in this school. Consider the
              Sibling reason.
            </p>
          ) : null}
          <div>
            <Label className="mb-1.5 block text-sm">Reason</Label>
            <Select value={reasonId} onValueChange={applyReason}>
              <SelectTrigger className="w-full" aria-label="Concession reason">
                <SelectValue placeholder="Choose reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ConcessionMode)}>
              <SelectTrigger className="w-full" aria-label="Concession type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage</SelectItem>
                <SelectItem value="fixed_discount">Fixed amount off</SelectItem>
                <SelectItem value="waiver">Full waiver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode !== "waiver" ? (
            <div>
              <Label className="mb-1.5 block text-sm">
                {mode === "percent" ? "Percent" : "Amount (PKR)"}
              </Label>
              <Input
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-label="Concession value"
              />
            </div>
          ) : null}
          <div>
            <Label className="mb-1.5 block text-sm">Note (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
          </div>
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className={BRAND} disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
