import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Wallet } from "lucide-react"

import generationService, { LEDGER_QUERY_KEY, type LedgerMonth } from "@/api/fees/generation.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, clsRowClass, ClsStatCard, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { CreditEntries } from "@/features/fees/components"
import { cn } from "@/lib/utils"

import { errorText } from "../fee-structure/fee-structure-rules"
import { formatPkr, statusTone } from "./generation-rules"

const pkr = (n: number) => `PKR ${formatPkr(n)}`

/** Monthly ledger for one student: every month billed, what was paid, what is outstanding, and credit. */
export function StudentLedgerView({ studentId, onBack, backLabel = "Back" }: { studentId: number; onBack: () => void; backLabel?: string }) {
  const ledger = useQuery({
    queryKey: [LEDGER_QUERY_KEY, studentId],
    queryFn: () => generationService.ledger(studentId),
  })
  const data = ledger.data

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-[var(--cls-muted)]" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> {backLabel}
        </Button>
      </div>

      {ledger.isError ? (
        <ClsPanel className="border-red-200">
          <ClsEmpty title="Couldn't load the ledger">
            <div className="grid justify-items-center gap-3">
              <p>{errorText(ledger.error)}</p>
              <Button size="sm" variant="outline" onClick={() => void ledger.refetch()}>
                Try again
              </Button>
            </div>
          </ClsEmpty>
        </ClsPanel>
      ) : !data ? (
        <div className="grid gap-4" aria-label="Loading ledger">
          <Skeleton className="h-10 w-72 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[var(--cls-ink)]">Monthly Ledger — {data.student.name}</h2>
            <p className="text-xs text-[var(--cls-muted)]">
              Admission No. {data.student.admissionNo}
              {data.student.class ? ` · ${data.student.class.label}` : ""}
              {data.student.status !== "Active" ? ` · ${data.student.status}` : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ClsStatCard label="Total Due (all months)" value={pkr(data.summary.totalDue)} />
            <ClsStatCard label="Total Paid" value={pkr(data.summary.totalPaid)} accent="success" />
            <ClsStatCard
              label="Balance Outstanding"
              value={pkr(data.summary.outstanding)}
              accent={data.summary.outstanding > 0 ? "warning" : "default"}
              hint={data.summary.openMonths ? `${data.summary.openMonths} open month${data.summary.openMonths === 1 ? "" : "s"}` : "All months settled"}
            />
          </div>

          {data.summary.creditBalance > 0 ? (
            <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" data-testid="credit-balance">
              <Wallet className="size-4 shrink-0" aria-hidden />
              Credit balance {pkr(data.summary.creditBalance)}
              <span className="text-xs text-emerald-800">· net {data.summary.netBalance >= 0 ? "due" : "in credit"} {pkr(Math.abs(data.summary.netBalance))}</span>
            </p>
          ) : null}

          {data.creditHistory?.length ? (
            <ClsPanel>
              <div className="px-4 pt-4 pb-2">
                <h3 className="font-semibold text-[var(--cls-ink)]">Credit history</h3>
                <p className="text-xs text-[var(--cls-muted)]">Excess payments are held as credit and applied to the oldest unpaid fee. Credit is not refunded.</p>
              </div>
              <div data-testid="ledger-credit-history"><CreditEntries entries={data.creditHistory} /></div>
            </ClsPanel>
          ) : null}

          {!data.months.length ? (
            <ClsPanel>
              <ClsEmpty title="No fee records yet">Records appear here once months are generated for this student.</ClsEmpty>
            </ClsPanel>
          ) : (
            <ClsPanel>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className={clsHeadRowClass}>
                      <ClsTh>Month</ClsTh>
                      <ClsTh className="text-right">Due (PKR)</ClsTh>
                      <ClsTh className="text-right">Paid (PKR)</ClsTh>
                      <ClsTh className="text-right">Outstanding (PKR)</ClsTh>
                      <ClsTh>Status</ClsTh>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.months.map((m) => (
                      <TableRow key={m.month} className={clsRowClass}>
                        <TableCell className="font-medium text-[var(--cls-ink)]">
                          {m.label}
                          <BillBreakdown month={m} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatPkr(m.due)}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.paid ? formatPkr(m.paid) : "—"}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", m.outstanding > 0 && "text-red-600")}>
                          {m.outstanding ? formatPkr(m.outstanding) : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={statusTone(m.status)} showDot>
                            {m.status}
                          </StatusChip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-[var(--cls-border)] sm:hidden">
                {data.months.map((m) => (
                  <li key={m.month} className="grid gap-1 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--cls-ink)]">{m.label}</span>
                      <StatusChip tone={statusTone(m.status)} showDot>
                        {m.status}
                      </StatusChip>
                    </div>
                    <BillBreakdown month={m} />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <span>
                        <span className="block text-[var(--cls-muted)]">Due</span>
                        <span className="tabular-nums">{formatPkr(m.due)}</span>
                      </span>
                      <span>
                        <span className="block text-[var(--cls-muted)]">Paid</span>
                        <span className="tabular-nums">{m.paid ? formatPkr(m.paid) : "—"}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[var(--cls-muted)]">Outstanding</span>
                        <span className={cn("tabular-nums", m.outstanding > 0 && "text-red-600")}>{m.outstanding ? formatPkr(m.outstanding) : "—"}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </ClsPanel>
          )}
        </>
      )}
    </div>
  )
}

/** Lists separately billed fees when a month has more than tuition. */
function BillBreakdown({ month }: { month: LedgerMonth }) {
  if (month.bills.length < 2) return null
  return (
    <span className="block text-[11px] font-normal text-[var(--cls-muted)]">
      {month.bills.map((b) => `${b.feeType} ${formatPkr(b.due)}`).join(" + ")}
    </span>
  )
}
