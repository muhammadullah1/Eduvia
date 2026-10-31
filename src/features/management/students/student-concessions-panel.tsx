import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BadgePercent, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import concessionsService, {
  type ConcessionMode,
  type ConcessionReason,
  CONCESSIONS_QUERY_KEY,
  type CreateConcessionInput,
  type FeeConcession,
} from "@/api/fees/concessions.service"
import { FEE_TYPES, type FeeType } from "@/api/fees/fee-structure.service"
import { ClsPanel, ClsPanelHeader } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { MonthPicker } from "@/components/ui/month-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchool } from "@/data/store"
import { useCan } from "@/lib/access"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { formatDate } from "@/lib/format"

import { errorText, formatAmount, MODE_LABEL, modeHint, STATUS_TONE, valueError, valueText } from "../fee-concessions/concession-rules"

const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

/** Student-scoped fee concession: one active Approved row per fee type. */
export function StudentConcessionsPanel({ studentId }: { studentId: number }) {
  const queryClient = useQueryClient()
  const { state } = useSchool()
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
      if (row.status === "PendingApproval") {
        toast.success("Concession submitted for approval")
        return
      }
      toast.success("Concession applied")
    },
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
          allowedModes={state.settings.fees.concessionPolicy.allowedModes}
          existing={list.data || []}
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
          {row.feeType} · from {formatDate(row.effectiveFrom)} · {valueText(row)}
        </p>
      </div>
      <StatusChip tone={STATUS_TONE[row.status]}>
        {row.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
      </StatusChip>
    </li>
  )
}

/**
 * One concession per fee type, chosen explicitly. An existing Approved concession is
 * only superseded when "Replace" is confirmed (never stacked), a pending one blocks a
 * new request, and bills already generated keep their amounts. The API enforces the
 * same rules; its message is shown if it still refuses (e.g. no verified family).
 */
function AssignDialog({
  studentId,
  reasons,
  allowedModes,
  existing,
  suggestSibling,
  saving,
  onClose,
  onSubmit,
}: {
  studentId: number
  reasons: ConcessionReason[]
  allowedModes: ConcessionMode[]
  existing: FeeConcession[]
  suggestSibling: boolean
  saving: boolean
  onClose: () => void
  onSubmit: (body: CreateConcessionInput) => Promise<unknown>
}) {
  const siblingReason = reasons.find((r) => r.requiresFamily)
  const [reasonId, setReasonId] = useState(() => {
    if (suggestSibling && siblingReason) return String(siblingReason.id)
    return ""
  })
  const [feeType, setFeeType] = useState<FeeType>("Tuition")
  const firstMode = allowedModes.find(() => true) ?? "percent"
  const [mode, setMode] = useState<ConcessionMode>(firstMode)
  const [value, setValue] = useState("")
  const [notes, setNotes] = useState("")
  const [replace, setReplace] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const reason = reasons.find((r) => String(r.id) === reasonId)
  const current = existing.find((r) => r.feeType === feeType && r.status === "Approved")
  const pending = existing.find((r) => r.feeType === feeType && r.status === "PendingApproval")
  const problem = valueError(mode, value)
  let blocker: string | null = null
  if (!reasonId) blocker = "Pick a reason."
  else if (!allowedModes.includes(mode)) blocker = "This mode is turned off in Settings → Fee billing."
  else if (pending) blocker = `A ${feeType} concession is already waiting for approval. Approve or reject it first.`
  else if (problem) blocker = problem
  else if (current && !replace) blocker = `Confirm replacing the current ${feeType} concession.`

  function change(next: () => void) {
    next()
    setServerError(null)
  }
  function applyReason(id: string) {
    change(() => setReasonId(id))
    const picked = reasons.find((r) => String(r.id) === id)
    if (!picked) return
    if (picked.defaultMode && allowedModes.includes(picked.defaultMode)) setMode(picked.defaultMode)
    if (picked.defaultValue != null) setValue(String(picked.defaultValue))
  }
  async function submit() {
    setSubmitted(true)
    if (blocker) return
    try {
      let amount = Number(value)
      if (mode === "waiver") amount = 0
      await onSubmit({
        studentId,
        reasonId: Number(reasonId),
        mode,
        value: amount,
        feeType,
        notes: notes.trim() || null,
        replaceExisting: Boolean(current),
      })
    } catch (err) {
      setServerError(errorText(err))
    }
  }

  let valueLabel = "Amount off (PKR)"
  if (mode === "percent") valueLabel = "Percent off"
  if (mode === "fixed_payable") valueLabel = "Amount payable (PKR)"

  return (
    <Dialog open onOpenChange={(v) => !saving && !v && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg" data-testid="concession-dialog">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Set fee concession
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--cls-muted)]">
            Applies to bills generated from now on. Bills already generated keep their amounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto px-6 py-5">
          {suggestSibling && siblingReason && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
              This student shares a parent account with another student. {siblingReason.label} needs
              them to be in a verified family.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Fee type</Label>
              <Select value={feeType} onValueChange={(v) => change(() => { setFeeType(v as FeeType); setReplace(false) })}>
                <SelectTrigger className="w-full" aria-label="Fee type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Reason</Label>
              <Select value={reasonId} onValueChange={applyReason}>
                <SelectTrigger className="w-full" aria-label="Concession reason">
                  <SelectValue placeholder="Choose reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {reason?.requiresFamily && (
            <p className="text-xs text-[var(--cls-muted)]" data-testid="family-note">
              {reason.label} is only allowed when this student is in a verified family with another
              active student. Verify the family under Families first.
            </p>
          )}
          <div>
            <Label className="mb-1.5 block text-sm">Mode</Label>
            <Select value={mode} onValueChange={(v) => change(() => setMode(v as ConcessionMode))}>
              <SelectTrigger className="w-full" aria-label="Concession mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedModes.map((item) => (
                  <SelectItem key={item} value={item}>{MODE_LABEL[item]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-[var(--cls-muted)]">{modeHint(mode)}</p>
          </div>
          {mode !== "waiver" && (
            <div>
              <Label className="mb-1.5 block text-sm">{valueLabel}</Label>
              <Input
                inputMode="decimal"
                value={value}
                onChange={(e) => change(() => setValue(e.target.value))}
                aria-label="Concession value"
                aria-invalid={submitted && Boolean(problem)}
              />
              {submitted && problem && <p className="mt-1 text-xs text-destructive">{problem}</p>}
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-sm">Note (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
          </div>
          {pending && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
              A {feeType} concession ({valueText(pending)}) is waiting for approval. Approve or reject it
              before setting another.
            </p>
          )}
          {current && !pending && (
            <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900" data-testid="replace-confirm">
              <Checkbox
                checked={replace}
                onCheckedChange={(on) => change(() => setReplace(on === true))}
                aria-label="Replace the current concession"
              />
              <span>
                Replace the current {feeType} concession ({current.reasonLabel || "Concession"},{" "}
                {valueText(current)}). It stays in history as superseded; concessions are never added
                together.
              </span>
            </label>
          )}
          {serverError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
              {serverError}
            </p>
          )}
          {submitted && blocker && !serverError && !problem && (
            <p className="text-xs text-destructive" role="alert">{blocker}</p>
          )}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className={BRAND} disabled={saving || Boolean(pending)} onClick={() => void submit()}>
            {saving && "Saving…"}
            {!saving && current && "Replace"}
            {!saving && !current && "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
