import type { CreditEntry } from "@/api/fees/collect.service"
import { formatDate } from "@/lib/format"

const formatPkr = (n: number) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })

/** Shared list of credit movements (also used by the student ledger). */
export function CreditEntries({ entries }: { entries: CreditEntry[] }) {
  return (
    <ul className="divide-y divide-[var(--cls-border)]">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="min-w-0">
            <span className="block truncate text-sm text-[var(--cls-ink)]">
              {e.type === "Credit" ? "Credit added" : e.type === "Applied" ? `Applied to ${e.feeMonth ? `${e.feeMonth.label} ${e.feeMonth.feeType}` : "a bill"}` : "Reversal"}
            </span>
            <span className="block truncate text-xs text-[var(--cls-muted)]">
              {formatDate(String(e.date).slice(0, 10))}{e.receiptNo ? ` · ${e.receiptNo}` : e.type === "Applied" ? " · on billing" : ""}{e.source !== "payment" ? ` · ${e.source}` : ""}
            </span>
          </span>
          <span className="grid shrink-0 justify-items-end text-sm tabular-nums">
            <span className={e.type === "Credit" ? "font-medium text-emerald-700" : "text-[var(--cls-ink)]"}>{e.type === "Credit" ? "+" : "−"}{formatPkr(e.amount)}</span>
            <span className="text-[11px] text-[var(--cls-muted)]">bal {formatPkr(e.balanceAfter)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

