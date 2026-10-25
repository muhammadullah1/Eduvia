import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, GraduationCap, HandCoins, Lock, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react"
import { useState } from "react"

import financeService, { INCOME_CATEGORIES, type IncomeCategory, type IncomeRow } from "@/api/finance/finance.service"
import { reportCellClass,ReportHeadRow, ReportPanel, ReportPanelMessage } from "@/components/app/report-layout"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableFooter, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import type { EntryValues } from "./entry"
import { EntrySheet } from "./entry-sheet"
import { amount, errorText, pkrAmount } from "./format"
import { monthName } from "./periods"
import { CategoryChip, DeleteReasonDialog, TotalTile } from "./shared"

const COLUMNS = [
  { key: "category", label: "CATEGORY" },
  { key: "amount", label: "AMOUNT (PKR)" },
  { key: "date", label: "DATE" },
  { key: "description", label: "DESCRIPTION" },
  { key: "reference", label: "REFERENCE" },
  { key: "actions", label: "" },
]

const toValues = (row: IncomeRow): EntryValues => ({
  category: row.category,
  amount: String(row.amount),
  date: row.date,
  description: row.description,
  referenceNo: row.reference ?? "",
  paymentMethod: "",
})

/**
 * Income tab (Figma 127-74391): the month's total, then every income line. Fee
 * income rows come from confirmed fee payments (locked, with View Receipt);
 * Donation / Grant / Misc are added here, edited, or deleted with a reason.
 */
export function IncomeTab({ month }: { month: string }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ["finance", "income", month], queryFn: () => financeService.income(month) })
  const [sheet, setSheet] = useState<{ mode: "add" | "edit"; row?: IncomeRow } | null>(null)
  const [deleting, setDeleting] = useState<IncomeRow | null>(null)
  const [receiptBusy, setReceiptBusy] = useState<number | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ["finance"] })
  const save = useMutation({
    mutationFn: (values: EntryValues) => {
      const body = {
        category: values.category as IncomeCategory,
        amount: Number(values.amount),
        date: values.date,
        description: values.description.trim(),
        referenceNo: values.referenceNo.trim() || null,
      }
      return sheet?.mode === "edit" && sheet.row?.entryId ? financeService.updateIncome(sheet.row.entryId, body) : financeService.addIncome(body)
    },
    onSuccess: (row) => {
      toast.success(sheet?.mode === "edit" ? "Income updated" : `${row.categoryLabel} of ${pkrAmount(row.amount)} recorded`)
      setSheet(null)
      void refresh()
    },
    onError: (err) => toast.error(errorText(err, "Could not save the income")),
  })
  const remove = useMutation({
    mutationFn: ({ row, reason }: { row: IncomeRow; reason: string }) => financeService.removeIncome(row.entryId as number, reason),
    onSuccess: () => {
      toast.success("Income entry deleted")
      setDeleting(null)
      void refresh()
    },
    onError: (err) => toast.error(errorText(err, "Could not delete the entry")),
  })

  async function viewReceipt(row: IncomeRow) {
    if (!row.paymentId) return
    // Open the tab before the fetch so the browser treats it as a user action.
    const tab = window.open("", "_blank")
    setReceiptBusy(row.paymentId)
    try {
      await financeService.openReceipt(row.paymentId, row.receiptNo, tab)
      if (!tab) toast.info("Pop-ups are blocked, so the receipt was downloaded instead")
    } catch (err) {
      tab?.close()
      toast.error(errorText(err, "Could not open the receipt"))
    } finally {
      setReceiptBusy(null)
    }
  }

  const data = list.data
  const rows = data?.rows ?? []
  const label = monthName(month)

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="finance-income">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <TotalTile icon={Wallet} label={`Total Income (${label})`} value={data ? pkrAmount(data.totals.total) : "—"} tone="income" testId="income-total" />
          <TotalTile icon={GraduationCap} label="Fee income" value={data ? pkrAmount(data.totals.fee) : "—"} />
          <TotalTile icon={HandCoins} label="Other income" value={data ? pkrAmount(data.totals.other) : "—"} />
        </div>
        <Button onClick={() => setSheet({ mode: "add" })} className="w-full lg:w-auto">
          <Plus data-icon="inline-start" />
          Add Other Income
        </Button>
      </div>

      <ReportPanel>
        {list.isLoading ? (
          <ReportPanelMessage title="Loading income…" />
        ) : list.isError ? (
          <ReportPanelMessage
            title="Income unavailable"
            detail={errorText(list.error, "Could not load income.")}
            action={<Button variant="outline" size="sm" onClick={() => void list.refetch()}>Try again</Button>}
          />
        ) : rows.length === 0 ? (
          <ReportPanelMessage
            title={`No income in ${label}`}
            detail="Fee payments appear here automatically once collected. Add donations, grants or other income with Add Other Income."
          />
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <ReportHeadRow columns={COLUMNS} />
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-[var(--cls-border)]" data-testid="income-row">
                      <TableCell className={reportCellClass}>
                        <CategoryChip category={row.category} label={row.categoryLabel} />
                      </TableCell>
                      <TableCell className={cn(reportCellClass, "font-semibold whitespace-nowrap text-emerald-800 tabular-nums")}>{amount(row.amount)}</TableCell>
                      <TableCell className={cn(reportCellClass, "whitespace-nowrap text-[var(--cls-muted)]")}>{row.date}</TableCell>
                      <TableCell className={cn(reportCellClass, "max-w-[340px]")}>
                        <p className="truncate" title={row.description}>{row.description}</p>
                        {row.locked ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--cls-muted)]">
                            <RefreshCw className="size-3" aria-hidden /> {row.detail}
                          </p>
                        ) : row.originalCategory ? (
                          <p className="mt-0.5 text-xs text-[var(--cls-muted)]">Recorded as “{row.originalCategory}”</p>
                        ) : null}
                      </TableCell>
                      <TableCell className={cn(reportCellClass, "font-mono text-xs whitespace-nowrap text-[var(--cls-muted)]")}>{row.reference ?? "—"}</TableCell>
                      <TableCell className={cn(reportCellClass, "text-right whitespace-nowrap")}>
                        <RowActions row={row} busy={receiptBusy === row.paymentId} onReceipt={viewReceipt} onEdit={() => setSheet({ mode: "edit", row })} onDelete={() => setDeleting(row)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="border-0 bg-[#1f5e3b] text-white hover:bg-[#1f5e3b]">
                    <TableCell className="py-3.5 font-semibold">Total</TableCell>
                    <TableCell className="py-3.5 font-semibold tabular-nums" data-testid="income-footer-total">{amount(data?.totals.total ?? 0)}</TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            {/* Phone cards */}
            <ul className="divide-y divide-[var(--cls-border)] md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-1.5 px-4 py-3" data-testid="income-card">
                  <div className="flex items-center justify-between gap-2">
                    <CategoryChip category={row.category} label={row.categoryLabel} />
                    <span className="font-semibold text-emerald-800 tabular-nums">{amount(row.amount)}</span>
                  </div>
                  <p className="text-sm break-words text-[var(--cls-ink)]">{row.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--cls-muted)]">
                    <span>
                      {row.date}
                      {row.reference ? <span className="ml-2 font-mono break-all">{row.reference}</span> : null}
                    </span>
                    <RowActions row={row} busy={receiptBusy === row.paymentId} onReceipt={viewReceipt} onEdit={() => setSheet({ mode: "edit", row })} onDelete={() => setDeleting(row)} />
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between bg-[#1f5e3b] px-4 py-3 font-semibold text-white">
                <span>Total</span>
                <span className="tabular-nums">{amount(data?.totals.total ?? 0)}</span>
              </li>
            </ul>
          </>
        )}
      </ReportPanel>

      <EntrySheet
        open={Boolean(sheet)}
        kind="income"
        mode={sheet?.mode ?? "add"}
        categories={INCOME_CATEGORIES}
        initial={sheet?.row ? toValues(sheet.row) : null}
        saving={save.isPending}
        onSubmit={(values) => save.mutate(values)}
        onClose={() => setSheet(null)}
      />
      <DeleteReasonDialog
        open={Boolean(deleting)}
        title="Delete this income entry?"
        description={
          deleting ? (
            <>
              {deleting.categoryLabel} of <strong>{pkrAmount(deleting.amount)}</strong> on {deleting.date} will be removed from income and the reports. It stays in the audit log.
            </>
          ) : null
        }
        busy={remove.isPending}
        onConfirm={(reason) => deleting && remove.mutate({ row: deleting, reason })}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function RowActions({
  row,
  busy,
  onReceipt,
  onEdit,
  onDelete,
}: {
  row: IncomeRow
  busy: boolean
  onReceipt: (row: IncomeRow) => void
  onEdit: () => void
  onDelete: () => void
}) {
  if (row.locked) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-60"
          onClick={() => onReceipt(row)}
          disabled={busy}
        >
          {busy ? "Opening…" : "View Receipt"} <ExternalLink className="size-3" aria-hidden />
        </button>
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600" title="Fee income comes from fee collection and can't be edited here">
          <Lock className="size-3" aria-hidden /> Locked
        </span>
      </span>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${row.description}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="size-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-red-600 focus:text-red-700">
          <Trash2 className="size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
