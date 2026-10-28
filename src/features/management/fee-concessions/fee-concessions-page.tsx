import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BadgePercent, Check, Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import concessionsService, {
  CONCESSIONS_QUERY_KEY,
  type ConcessionStatus,
  type CreateConcessionInput,
  type FeeConcession,
} from "@/api/fees/concessions.service"
import feePoliciesService, { FEE_POLICIES_QUERY_KEY } from "@/api/fees/fee-policies.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSchool } from "@/data/store"
import { useActor } from "@/lib/actor"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"

import { CATEGORY_LABEL, errorText, formatAmount, MODE_LABEL, STATUS_TONE } from "./concession-rules"
import { RequestConcessionDialog } from "./request-concession-dialog"

const ALL = "all"
const BRAND = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

/** Concessions: request, approve/reject queue, fee-type eligibility, and revoke. */
export function FeeConcessionsPage() {
  const { role } = useActor()
  const { state } = useSchool()
  const concessionsLive = Boolean(state.settings.fees.concessionsEnabled)
  const canRequest = can(role, "fees.concessions.request")
  const canApprove = can(role, "fees.concessions.approve")
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string>(ALL)
  const [requestOpen, setRequestOpen] = useState(false)
  const [actionOf, setActionOf] = useState<{ row: FeeConcession; kind: "reject" | "revoke" } | null>(null)
  const [actionReason, setActionReason] = useState("")

  const list = useQuery({
    queryKey: [CONCESSIONS_QUERY_KEY, status],
    queryFn: () => {
      if (status === ALL) return concessionsService.list()
      return concessionsService.list({ status: status as ConcessionStatus })
    },
  })
  const policies = useQuery({
    queryKey: [FEE_POLICIES_QUERY_KEY],
    queryFn: () => feePoliciesService.list(),
    enabled: canApprove,
  })

  const create = useMutation({
    mutationFn: (input: CreateConcessionInput) => concessionsService.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      setRequestOpen(false)
      toast.success("Concession draft saved")
    },
    onError: (err) => toast.error(errorText(err)),
  })
  const submit = useMutation({
    mutationFn: (id: number) => concessionsService.submit(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      toast.success("Submitted for approval")
    },
    onError: (err) => toast.error(errorText(err)),
  })
  const approve = useMutation({
    mutationFn: (id: number) => concessionsService.approve(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      toast.success("Concession approved")
    },
    onError: (err) => toast.error(errorText(err)),
  })
  const decide = useMutation({
    mutationFn: async () => {
      if (!actionOf) return
      if (actionOf.kind === "reject") await concessionsService.reject(actionOf.row.id, actionReason.trim())
      else await concessionsService.revoke(actionOf.row.id, actionReason.trim())
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [CONCESSIONS_QUERY_KEY] })
      if (actionOf?.kind === "reject") toast.success("Rejected")
      else toast.success("Revoked")
      setActionOf(null)
      setActionReason("")
    },
    onError: (err) => toast.error(errorText(err)),
  })
  const togglePolicy = useMutation({
    mutationFn: (item: { feeType: string; concessionEligible: boolean }) =>
      feePoliciesService.update([{ feeType: item.feeType as never, concessionEligible: item.concessionEligible }]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [FEE_POLICIES_QUERY_KEY] })
      toast.success("Fee type policy updated")
    },
    onError: (err) => toast.error(errorText(err)),
  })

  const rows = list.data ?? []
  const pending = useMemo(() => rows.filter((r) => r.status === "PendingApproval").length, [rows])

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cls-ink)]">Fee concessions</h2>
          <p className="text-sm text-[var(--cls-muted)]">
            Scholarships, waivers and sibling discounts — approved before they affect new bills.
            {pending ? ` · ${pending} awaiting approval` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="concession-status" className="text-xs font-medium text-[var(--cls-muted)]">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                id="concession-status"
                className="w-full border-[var(--cls-border)] bg-white sm:w-44"
                aria-label="Concession status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectItem value="PendingApproval">Pending approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canRequest ? (
            <Button className={BRAND} onClick={() => { create.reset(); setRequestOpen(true) }}>
              <Plus data-icon="inline-start" /> Request concession
            </Button>
          ) : null}
        </div>
      </div>

      {!concessionsLive ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
        >
          <p className="font-medium">Dynamic concessions are off</p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            You can still draft and approve concessions. New bills keep using the legacy fixed monthly fee
            until Super Admin turns on Dynamic concessions in Settings → Rules &amp; Config.
          </p>
        </div>
      ) : null}

      {canApprove && policies.data?.length ? (
        <ClsPanel>
          <div className="flex items-start gap-3 border-b border-[var(--cls-border)] px-4 py-3">
            <BadgePercent className="mt-0.5 size-4 text-[var(--cls-brand)]" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-[var(--cls-ink)]">Concession eligibility by fee type</p>
              <p className="text-xs text-[var(--cls-muted)]">
                Ineligible types never receive a discount, even if a scholarship is approved.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-[var(--cls-border)]">
            {policies.data.map((p) => (
              <li key={p.feeType} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--cls-ink)]">{p.label || p.feeType}</p>
                  <p className="text-xs text-[var(--cls-muted)]">{p.concessionEligible ? "Eligible" : "Not eligible"}</p>
                </div>
                <Switch
                  checked={p.concessionEligible}
                  disabled={togglePolicy.isPending}
                  onCheckedChange={(checked) =>
                    togglePolicy.mutate({ feeType: p.feeType, concessionEligible: checked })
                  }
                  aria-label={`Concession eligible for ${p.feeType}`}
                />
              </li>
            ))}
          </ul>
        </ClsPanel>
      ) : null}

      {list.isError ? (
        <ClsPanel>
          <ClsEmpty title="Couldn't load concessions">
            <Button size="sm" className={BRAND} onClick={() => void list.refetch()}>Try again</Button>
          </ClsEmpty>
        </ClsPanel>
      ) : !list.data ? (
        <ClsPanel><div className="h-40 animate-pulse bg-[var(--cls-border)]/40" /></ClsPanel>
      ) : !rows.length ? (
        <ClsPanel>
          <ClsEmpty title="No concessions yet">
            {canRequest ? "Request a draft concession for a student to get started." : "Nothing to show."}
          </ClsEmpty>
        </ClsPanel>
      ) : (
        <ClsPanel>
          <Table>
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh className="pl-4">Student</ClsTh>
                <ClsTh>Type</ClsTh>
                <ClsTh className="hidden sm:table-cell">Fee types</ClsTh>
                <ClsTh>Status</ClsTh>
                <ClsTh className="pr-4 text-right">Actions</ClsTh>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={clsRowClass}>
                  <TableCell className="pl-4">
                    <p className="font-medium text-[var(--cls-ink)]">{row.studentName || `Student #${row.studentId}`}</p>
                    <p className="text-xs text-[var(--cls-muted)]">
                      {row.admissionNo || "—"} · {CATEGORY_LABEL[row.category]}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-[var(--cls-ink)]">{MODE_LABEL[row.mode]}</p>
                    <p className="text-xs text-[var(--cls-muted)]">
                      {row.mode === "waiver"
                        ? "100%"
                        : row.mode === "percent"
                          ? `${formatAmount(row.value)}%`
                          : `PKR ${formatAmount(row.value)}`}
                      {" · "}
                      from {formatDate(row.effectiveFrom)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {row.feeTypes.map((t) => (
                        <span key={t} className="rounded-full bg-[var(--cls-border)]/50 px-2 py-0.5 text-[11px] text-[var(--cls-ink)]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={STATUS_TONE[row.status]}>{row.status.replace(/([a-z])([A-Z])/g, "$1 $2")}</StatusChip>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex flex-wrap justify-end gap-1">
                      {canRequest && row.status === "Draft" ? (
                        <Button size="sm" className={BRAND} disabled={submit.isPending} onClick={() => submit.mutate(row.id)}>
                          Submit
                        </Button>
                      ) : null}
                      {canApprove && row.status === "PendingApproval" ? (
                        <>
                          <Button size="sm" className={BRAND} disabled={approve.isPending} onClick={() => approve.mutate(row.id)}>
                            <Check className="size-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setActionOf({ row, kind: "reject" }); setActionReason("") }}>
                            <X className="size-3.5" /> Reject
                          </Button>
                        </>
                      ) : null}
                      {canApprove && row.status === "Approved" ? (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setActionOf({ row, kind: "revoke" }); setActionReason("") }}>
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ClsPanel>
      )}

      {canRequest ? (
        <RequestConcessionDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          saving={create.isPending}
          onSubmit={async (input) => { await create.mutateAsync(input) }}
        />
      ) : null}

      <Dialog open={Boolean(actionOf)} onOpenChange={(open) => !open && setActionOf(null)}>
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4">
            <DialogTitle>{actionOf?.kind === "reject" ? "Reject concession" : "Revoke concession"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 px-6 py-5">
            <Label className="text-sm font-medium text-[var(--cls-ink)]">Reason</Label>
            <Textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
              className="border-[var(--cls-border)] bg-white"
              placeholder="At least 5 characters"
            />
          </div>
          <DialogFooter className={CLS_MODAL_FOOTER}>
            <Button variant="outline" onClick={() => setActionOf(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={actionReason.trim().length < 5 || decide.isPending}
              onClick={() => decide.mutate()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
