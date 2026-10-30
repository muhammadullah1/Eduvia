import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  Printer,
  ReceiptText,
  Search,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import collectService, {
  COLLECT_QUERY_KEY,
  type CollectContext,
  type CollectInput,
  type CollectStudent,
  type PaymentMethod,
  type ServerReceipt,
} from "@/api/fees/collect.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, clsRowClass, ClsStatCard, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { StudentLedgerView } from "@/features/management/screens"
import { useCan } from "@/lib/access"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { printDocument } from "@/lib/print"
import { cn } from "@/lib/utils"

import { CreditEntries } from "../credit-entries"
import {
  allocationRows,
  amountError,
  canApplyCredit,
  formatPkr,
  methodLabel,
  MIN_SEARCH,
  newIdempotencyKey,
  PAYMENT_METHODS,
  pkr,
  receiptPrintRows,
} from "./collect-rules"

const brandButton = "bg-[var(--cls-brand)] text-white hover:bg-[var(--cls-brand-hover)]"

function errorText(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Something went wrong. Please try again."
}

function tone(status: string) {
  if (status === "Paid" || status === "Advance") return "success" as const
  if (status.startsWith("Partial")) return "warning" as const
  if (status === "Overdue" || status === "Unpaid") return "danger" as const
  return "neutral" as const
}

function useDebounced<T>(value: T, ms = 250) {
  const [out, setOut] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setOut(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return out
}

/**
 * Collect Fee (Figma 53-12926): find a student, see unpaid bills and credit, enter the
 * payment, preview the exact server allocation (oldest month first), confirm, print.
 */
export function CollectFeePage() {
  const [studentId, setStudentId] = useState<number | null>(null)
  const [ledgerOf, setLedgerOf] = useState<number | null>(null)
  const overview = useQuery({ queryKey: [COLLECT_QUERY_KEY, "overview"], queryFn: collectService.overview })
  const can = useCan()
  const seesTotals = can("fees.totals")

  if (ledgerOf) return <StudentLedgerView studentId={ledgerOf} onBack={() => setLedgerOf(null)} backLabel="Back to Collect Fee" />

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4" data-testid="collect-fee">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {overview.isError ? (
          <p className="text-sm text-red-600 sm:col-span-3">
            Couldn't load the summary. <button className="underline" onClick={() => void overview.refetch()}>Try again</button>
          </p>
        ) : !overview.data ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)
        ) : (
          <>
            <ClsStatCard icon={Users} label="Total Students" value={String(overview.data.totalStudents)} />
            <ClsStatCard icon={AlertTriangle} label="With Outstanding" value={String(overview.data.withOutstanding)} accent={overview.data.withOutstanding ? "warning" : "default"} />
            {seesTotals && overview.data.todayCollection ? (
              <ClsStatCard icon={Wallet} label="Today's Collection" value={pkr(overview.data.todayCollection.amount)} hint={`${overview.data.todayCollection.receipts} receipt${overview.data.todayCollection.receipts === 1 ? "" : "s"}`} />
            ) : overview.data.myCollectionToday ? (
              <ClsStatCard icon={ReceiptText} label="My Receipts Today" value={String(overview.data.myCollectionToday.receipts)} hint={`You collected ${pkr(overview.data.myCollectionToday.amount)}`} />
            ) : null}
          </>
        )}
      </div>

      {studentId ? (
        <CollectForStudent key={studentId} studentId={studentId} onClose={() => setStudentId(null)} onLedger={() => setLedgerOf(studentId)} />
      ) : (
        <ClsPanel className="p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--cls-ink)]">Collect Student Fee</h2>
              <p className="mt-1 text-sm text-[var(--cls-muted)]">
                Search by student name or admission number to view unpaid fee months, apply credit balance, and record collections.
              </p>
            </div>
            <StudentSearch onPick={(s) => setStudentId(s.id)} />
          </div>
        </ClsPanel>
      )}
    </div>
  )
}

function StudentSearch({ onPick }: { onPick: (s: CollectStudent) => void }) {
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const q = useDebounced(text.trim())
  const enabled = q.length >= MIN_SEARCH
  const results = useQuery({ queryKey: [COLLECT_QUERY_KEY, "search", q], queryFn: () => collectService.search(q), enabled })

  return (
    <div className="relative w-full max-w-xl">
      <Label htmlFor="collect-search" className="sr-only">Search students</Label>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 size-4 text-[var(--cls-muted)]" aria-hidden />
        <Input
          id="collect-search"
          value={text}
          autoComplete="off"
          placeholder="Search by student name or admission number..."
          className="h-11 w-full rounded-lg border border-[var(--cls-border)] bg-white pl-10 pr-4 text-sm"
          onChange={(e) => { setText(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
        />
      </div>
      {open && enabled ? (
        <div role="listbox" aria-label="Matching students" className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-[var(--cls-border)] bg-white shadow-lg">
          {results.isError ? (
            <p className="px-4 py-3 text-sm text-red-600">{errorText(results.error)}</p>
          ) : !results.data ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--cls-muted)]"><Loader2 className="size-4 animate-spin" /> Searching…</p>
          ) : !results.data.length ? (
            <p className="px-4 py-3 text-sm text-[var(--cls-muted)]">No students match “{q}”.</p>
          ) : (
            results.data.map((s) => (
              <button
                key={s.id}
                role="option"
                aria-selected={false}
                className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-[var(--cls-border)] px-4 py-2.5 text-left last:border-0 hover:bg-[var(--cls-surface-muted,#f6f7f9)]"
                onClick={() => { onPick(s); setOpen(false); setText("") }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--cls-ink)]">{s.name}</span>
                  <span className="block truncate text-xs text-[var(--cls-muted)]">{s.admissionNo}{s.class?.label ? ` · ${s.class.label}` : ""}{s.status !== "Active" ? ` · ${s.status}` : ""}</span>
                </span>
                <span className="grid shrink-0 justify-items-end gap-0.5 text-xs">
                  {s.outstanding > 0 ? <span className="font-medium text-red-600">{pkr(s.outstanding)} due</span> : <span className="text-emerald-700">Cleared</span>}
                  {s.creditBalance > 0 ? <span className="text-emerald-700">{pkr(s.creditBalance)} credit</span> : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

type Stage = "form" | "preview" | "done"

function CollectForStudent({ studentId, onClose, onLedger }: { studentId: number; onClose: () => void; onLedger: () => void }) {
  const queryClient = useQueryClient()
  const { role } = useActor()
  const { syncPortalForRoute } = useSchool()
  const ctx = useQuery({ queryKey: [COLLECT_QUERY_KEY, "student", studentId], queryFn: () => collectService.context(studentId) })
  const [stage, setStage] = useState<Stage>("form")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("Cash")
  const [date, setDate] = useState(getToday)
  const [notes, setNotes] = useState("")
  const [applyCredit, setApplyCredit] = useState(true)
  const [key, setKey] = useState(newIdempotencyKey)
  const [touched, setTouched] = useState(false)
  const [receipt, setReceipt] = useState<ServerReceipt | null>(null)

  const data = ctx.data
  const creditUsable = data ? canApplyCredit(data) : false
  const input = (): CollectInput => ({
    studentId,
    amount: Number(amount),
    method,
    paidOn: date,
    ...(notes.trim() ? { notes: notes.trim() } : {}),
    applyCredit: creditUsable && applyCredit,
    idempotencyKey: key,
  })
  const preview = useMutation({ mutationFn: collectService.preview, onSuccess: () => setStage("preview") })
  const record = useMutation({
    mutationFn: collectService.record,
    onSuccess: async (result) => {
      setReceipt(result.receipt)
      setStage("done")
      setKey(newIdempotencyKey())
      toast.success(result.duplicate ? `Already recorded as ${result.receipt.receiptNo}` : `Payment recorded · ${result.receipt.receiptNo}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [COLLECT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ["student-ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["fee-months"] }),
      ])
      // Keep the local store (Fee Management ledger, reports) in step with the server.
      if (role) void syncPortalForRoute(role, "collect-fee")
    },
    onError: (error) => toast.error(errorText(error)),
  })
  const amountProblem = amountError(amount)

  if (ctx.isError) {
    return (
      <ClsPanel className="border-red-200">
        <ClsEmpty title="Couldn't load this student">
          <div className="grid justify-items-center gap-3">
            <p>{errorText(ctx.error)}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void ctx.refetch()}>Try again</Button>
              <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        </ClsEmpty>
      </ClsPanel>
    )
  }
  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]" aria-label="Loading student">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  const reset = () => { setStage("form"); setAmount(""); setNotes(""); setTouched(false); setReceipt(null); setApplyCredit(true); preview.reset(); record.reset() }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <ClsPanel className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-[var(--cls-ink)]" data-testid="collect-student">{data.student.name}</h2>
          <p className="text-xs text-[var(--cls-muted)]">
            Admission No. {data.student.admissionNo}{data.student.class ? ` · ${data.student.class.label}` : ""}{data.student.status !== "Active" ? ` · ${data.student.status}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={data.outstanding > 0 ? "danger" : "success"} showDot>
            {data.outstanding > 0 ? `${pkr(data.outstanding)} outstanding` : "No outstanding"}
          </StatusChip>
          {data.creditBalance > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800" data-testid="credit-chip">
              <Wallet className="size-3.5" aria-hidden /> Credit {pkr(data.creditBalance)}
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={onLedger}><History data-icon="inline-start" /> Ledger</Button>
          <Button size="icon" variant="ghost" aria-label="Close student" onClick={onClose}><X /></Button>
        </div>
      </ClsPanel>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <OpenBills ctx={data} />
          <CreditHistory ctx={data} />
        </div>

        <ClsPanel className="min-w-0 p-4">
          {stage === "done" && receipt ? (
            <ReceiptCard receipt={receipt} studentLabel={`${data.student.name} (${data.student.admissionNo})`} classLabel={data.student.class?.label} onAnother={reset} onLedger={onLedger} />
          ) : stage === "preview" && preview.data ? (
            <div className="grid gap-4" data-testid="allocation-preview">
              <div>
                <h3 className="font-semibold text-[var(--cls-ink)]">Confirm allocation</h3>
                <p className="text-xs text-[var(--cls-muted)]">{pkr(Number(amount))} · {methodLabel(method)} · {formatDate(date)}</p>
              </div>
              <AllocationList receipt={preview.data.allocation} />
              {record.isError ? <p className="text-sm text-red-600" role="alert">{errorText(record.error)}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled={record.isPending} onClick={() => setStage("form")}><ArrowLeft data-icon="inline-start" /> Edit</Button>
                <Button className={brandButton} disabled={record.isPending} onClick={() => record.mutate(input())}>
                  {record.isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                  Confirm & record
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="grid gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                setTouched(true)
                if (!amountProblem) preview.mutate(input())
              }}
            >
              <h3 className="font-semibold text-[var(--cls-ink)]">Collect payment</h3>
              <div className="grid gap-1.5">
                <Label htmlFor="collect-amount">Amount received (PKR)</Label>
                <Input id="collect-amount" inputMode="decimal" value={amount} placeholder={data.outstanding > 0 ? formatPkr(data.outstanding) : "e.g. 5000"} onChange={(e) => setAmount(e.target.value)} aria-invalid={touched && !!amountProblem} />
                {data.outstanding > 0 ? (
                  <button type="button" className="justify-self-start text-xs text-[var(--cls-brand)] underline-offset-2 hover:underline" onClick={() => setAmount(String(Math.max(0, data.outstanding - (creditUsable && applyCredit ? data.creditBalance : 0))))}>
                    Fill outstanding{creditUsable && applyCredit ? " after credit" : ""}
                  </button>
                ) : null}
                {touched && amountProblem ? <p className="text-xs text-red-600" role="alert">{amountProblem}</p> : null}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger aria-label="Payment method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Payment date</Label>
                  <DatePicker value={date} maxDate={getToday()} aria-label="Payment date" onChange={(v) => setDate(v || getToday())} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="collect-notes">Note <span className="font-normal text-[var(--cls-muted)]">(optional)</span></Label>
                <Input id="collect-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reference, cheque no., remarks" />
              </div>
              {creditUsable ? (
                <label className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <span className="text-sm text-emerald-900">
                    Apply credit balance first
                    <span className="block text-xs text-emerald-800">{pkr(data.creditBalance)} available · used on the oldest unpaid month</span>
                  </span>
                  <Switch checked={applyCredit} onCheckedChange={setApplyCredit} aria-label="Apply credit balance" />
                </label>
              ) : null}
              <p className="text-xs text-[var(--cls-muted)]">The oldest unpaid month is cleared first. Anything above what is owed is kept as credit and applied to future fees automatically. Credit is not refunded.</p>
              {preview.isError ? <p className="text-sm text-red-600" role="alert">{errorText(preview.error)}</p> : null}
              <Button type="submit" className={cn(brandButton, "justify-self-stretch sm:justify-self-end")} disabled={preview.isPending}>
                {preview.isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                Preview allocation
              </Button>
            </form>
          )}
        </ClsPanel>
      </div>
    </div>
  )
}

function OpenBills({ ctx }: { ctx: CollectContext }) {
  return (
    <ClsPanel className="min-w-0">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-semibold text-[var(--cls-ink)]">Unpaid bills</h3>
        <span className="text-xs text-[var(--cls-muted)]">Oldest first</span>
      </div>
      {!ctx.openBills.length ? (
        <ClsEmpty title="Nothing unpaid">All billed months are settled{ctx.creditBalance > 0 ? "; the credit will be applied to the next bills" : ""}.</ClsEmpty>
      ) : (
        <>
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className={clsHeadRowClass}>
                  <ClsTh>Month</ClsTh>
                  <ClsTh>Fee</ClsTh>
                  <ClsTh className="text-right">Due</ClsTh>
                  <ClsTh className="text-right">Paid</ClsTh>
                  <ClsTh className="text-right">Balance</ClsTh>
                  <ClsTh>Status</ClsTh>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ctx.openBills.map((b) => (
                  <TableRow key={b.id} className={clsRowClass}>
                    <TableCell className="font-medium text-[var(--cls-ink)]">{b.label}</TableCell>
                    <TableCell>{b.feeType}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPkr(b.amountDue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.amountPaid ? formatPkr(b.amountPaid) : "—"}</TableCell>
                    <TableCell className="text-right font-medium text-red-600 tabular-nums">{formatPkr(b.balance)}</TableCell>
                    <TableCell><StatusChip tone={tone(b.status)} showDot>{b.status}</StatusChip></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-[var(--cls-border)] sm:hidden">
            {ctx.openBills.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--cls-ink)]">{b.label}</span>
                  <span className="block text-xs text-[var(--cls-muted)]">{b.feeType} · due {formatPkr(b.amountDue)}{b.amountPaid ? ` · paid ${formatPkr(b.amountPaid)}` : ""}</span>
                </span>
                <span className="grid shrink-0 justify-items-end gap-1">
                  <span className="text-sm font-medium text-red-600 tabular-nums">{formatPkr(b.balance)}</span>
                  <StatusChip tone={tone(b.status)} showDot>{b.status}</StatusChip>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ClsPanel>
  )
}

function CreditHistory({ ctx }: { ctx: CollectContext }) {
  if (!ctx.creditHistory.length) return null
  return (
    <ClsPanel className="min-w-0">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-semibold text-[var(--cls-ink)]">Recent credit activity</h3>
        <p className="text-xs text-[var(--cls-muted)]">Full history is in the student ledger.</p>
      </div>
      <div data-testid="credit-history"><CreditEntries entries={ctx.creditHistory} /></div>
    </ClsPanel>
  )
}

function AllocationList({ receipt }: { receipt: ServerReceipt }) {
  const rows = allocationRows(receipt)
  return (
    <div className="grid gap-2">
      <ul className="divide-y divide-[var(--cls-border)] rounded-lg border border-[var(--cls-border)]">
        {rows.length ? rows.map((r) => (
          <li key={r.key} className={cn("flex items-center justify-between gap-3 px-3 py-2", r.kind === "to-credit" && "bg-emerald-50")}>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-[var(--cls-ink)]">{r.label}</span>
              <span className="block text-xs text-[var(--cls-muted)]">{r.detail}</span>
            </span>
            <span className={cn("shrink-0 text-sm tabular-nums", r.kind === "to-credit" ? "text-emerald-700" : "text-[var(--cls-ink)]")}>{formatPkr(r.amount)}</span>
          </li>
        )) : <li className="px-3 py-2 text-sm text-[var(--cls-muted)]">Nothing to allocate.</li>}
      </ul>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-[var(--cls-muted)]">Amount received</dt><dd className="text-right font-medium tabular-nums">{pkr(receipt.amount)}</dd>
        {receipt.creditAppliedTotal > 0 ? (<><dt className="text-[var(--cls-muted)]">Credit used</dt><dd className="text-right tabular-nums">{pkr(receipt.creditAppliedTotal)}</dd></>) : null}
        <dt className="text-[var(--cls-muted)]">Credit balance after</dt><dd className="text-right tabular-nums" data-testid="credit-after">{pkr(receipt.creditBalance)}</dd>
      </dl>
    </div>
  )
}

function ReceiptCard({ receipt, studentLabel, classLabel, onAnother, onLedger }: { receipt: ServerReceipt; studentLabel: string; classLabel?: string; onAnother: () => void; onLedger: () => void }) {
  function print() {
    const opened = printDocument(
      `Fee receipt ${receipt.receiptNo}`,
      [
        `Student: ${studentLabel}`,
        `Class: ${classLabel ?? "—"}`,
        `Payment date: ${formatDate(receipt.paymentDate)} · Method: ${methodLabel(receipt.method)}`,
        `Recorded by: ${receipt.recordedBy?.name ?? "—"}`,
        ...(receipt.creditBalance > 0 ? [`Credit balance after this receipt: ${pkr(receipt.creditBalance)}`] : []),
      ],
      { columns: ["Fee month", "Detail", "Amount (PKR)"], rows: receiptPrintRows(receipt) },
    )
    if (!opened) toast.error("Allow pop-ups to print the receipt.")
  }
  return (
    <div className="grid gap-4" data-testid="receipt-card">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--cls-ink)]">Payment recorded</h3>
          <p className="truncate text-xs text-[var(--cls-muted)]">Receipt <span className="font-medium text-[var(--cls-ink)]">{receipt.receiptNo}</span> · {formatDate(receipt.paymentDate)}</p>
        </div>
      </div>
      <AllocationList receipt={receipt} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onLedger}><History data-icon="inline-start" /> Ledger</Button>
        <Button variant="outline" onClick={print}><Printer data-icon="inline-start" /> Print receipt</Button>
        <Button className={brandButton} onClick={onAnother}>Collect another</Button>
      </div>
    </div>
  )
}
