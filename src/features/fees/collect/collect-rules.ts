import type { CollectContext, PaymentMethod, ServerReceipt } from "@/api/fees/collect.service"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash", label: "Cash" },
  { value: "BankTransfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
  { value: "Online", label: "Online" },
]

export const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m

export const MIN_SEARCH = 2

/** Whole PKR with thousands separators; paisa only when present. */
export function formatPkr(n: number) {
  return Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
export const pkr = (n: number) => `PKR ${formatPkr(n)}`

/** Returns an error message, or null when the amount can be collected. */
export function amountError(raw: string): string | null {
  const text = raw.trim()
  if (!text) return "Enter the amount received."
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return "Use a positive amount with at most 2 decimals."
  const n = Number(text)
  if (n <= 0) return "Amount must be more than zero."
  if (n > 10_000_000) return "That amount looks too large. Check it and try again."
  return null
}

/** Credit can only be applied when there is credit and something open to pay. */
export const canApplyCredit = (ctx: Pick<CollectContext, "creditBalance" | "openBills">) => ctx.creditBalance > 0 && ctx.openBills.length > 0

export type AllocationRow = { key: string; label: string; detail: string; amount: number; kind: "credit" | "cash" | "to-credit" }

/** Flattens a server allocation (preview or receipt) into display rows, in the order they were applied. */
export function allocationRows(r: ServerReceipt): AllocationRow[] {
  const rows: AllocationRow[] = r.creditApplied.map((l, i) => ({
    key: `c-${l.month}-${l.feeType}-${i}`,
    label: l.label,
    detail: `${l.feeType} · paid from credit`,
    amount: l.amount,
    kind: "credit",
  }))
  r.feeMonths.forEach((l, i) => rows.push({ key: `m-${l.month}-${l.feeType}-${i}`, label: l.label, detail: `${l.feeType} · paid in ${methodLabel(r.method).toLowerCase()}`, amount: l.amount, kind: "cash" }))
  if (r.creditAdded > 0) rows.push({ key: "to-credit", label: "Added to credit", detail: "Applied automatically to future fees", amount: r.creditAdded, kind: "to-credit" })
  return rows
}

export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Lines for the printed receipt: this payment only, no running totals. */
export function receiptPrintRows(r: ServerReceipt): string[][] {
  return [
    ...allocationRows(r).map((row) => [row.label, row.detail, formatPkr(row.amount)]),
    ["Amount received", methodLabel(r.method), formatPkr(r.amount)],
  ]
}
