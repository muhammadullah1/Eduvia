import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Info, MoreHorizontal, Pencil, Plus, Receipt, Trash2, Users, Wrench } from "lucide-react"
import { useState } from "react"

import financeService, {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseRow,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/api/finance/finance.service"
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

const methodLabel = (key: string | null) => PAYMENT_METHODS.find((m) => m.key === key)?.label ?? null

const toValues = (row: ExpenseRow): EntryValues => ({
  category: row.category,
  amount: String(row.amount),
  date: row.date,
  description: row.description,
  referenceNo: row.referenceNo ?? "",
  paymentMethod: row.paymentMethod ?? "",
})

/**
 * Expenses tab (Figma): Total / Staff / Other cards, the payroll disclaimer and
 * the month's expenses. `ownOnly` is the accountant's view: they record
 * expenses and see the ones they recorded, without totals, edit or delete.
 */
export function ExpensesTab({ month, ownOnly = false }: { month: string; ownOnly?: boolean }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ["finance", "expenses", month], queryFn: () => financeService.expenses(month) })
  const [sheet, setSheet] = useState<{ mode: "add" | "edit"; row?: ExpenseRow } | null>(null)
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ["finance"] })
  const save = useMutation({
    mutationFn: (values: EntryValues) => {
      const body = {
        category: values.category as ExpenseCategory,
        amount: Number(values.amount),
        date: values.date,
        description: values.description.trim(),
        referenceNo: values.referenceNo.trim() || null,
        paymentMethod: (values.paymentMethod || null) as PaymentMethod | null,
      }
      return sheet?.mode === "edit" && sheet.row ? financeService.updateExpense(sheet.row.id, body) : financeService.addExpense(body)
    },
    onSuccess: (row) => {
      toast.success(sheet?.mode === "edit" ? "Expense updated" : `${row.categoryLabel} expense of ${pkrAmount(row.amount)} recorded`)
      setSheet(null)
      void refresh()
    },
    onError: (err) => toast.error(errorText(err, "Could not save the expense")),
  })
  const remove = useMutation({
    mutationFn: ({ row, reason }: { row: ExpenseRow; reason: string }) => financeService.removeExpense(row.id, reason),
    onSuccess: () => {
      toast.success("Expense deleted")
      setDeleting(null)
      void refresh()
    },
    onError: (err) => toast.error(errorText(err, "Could not delete the expense")),
  })

  const data = list.data
  const rows = data?.rows ?? []
  const totals = ownOnly ? undefined : data?.totals
  const label = monthName(month)
  const manage = !ownOnly
  const columns = [
    { key: "category", label: "CATEGORY" },
    { key: "amount", label: "AMOUNT (PKR)" },
    { key: "date", label: "DATE" },
    { key: "description", label: "DESCRIPTION" },
    { key: "reference", label: "REFERENCE" },
    { key: "method", label: "METHOD" },
    ...(manage ? [{ key: "actions", label: "" }] : []),
  ]

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="finance-expenses">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {totals ? (
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <TotalTile icon={Receipt} label={`Total Expenses (${label})`} value={pkrAmount(totals.total)} tone="expense" testId="expense-total" />
            <TotalTile icon={Users} label="Staff" value={pkrAmount(totals.staff)} testId="expense-staff" />
            <TotalTile icon={Wrench} label="Other" value={pkrAmount(totals.other)} testId="expense-other" />
          </div>
        ) : (
          <div>
            <h2 className="text-base font-semibold text-[var(--cls-ink)]">{ownOnly ? `Expenses you recorded — ${label}` : `Expenses — ${label}`}</h2>
            {ownOnly ? <p className="mt-0.5 text-sm text-[var(--cls-muted)]">Only your own entries are listed. Totals and reports are kept by the Super Admin.</p> : null}
          </div>
        )}
        <Button onClick={() => setSheet({ mode: "add" })} className="w-full lg:w-auto">
          <Plus data-icon="inline-start" />
          Add Expense
        </Button>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Staff Salary entries record salary disbursements for financial tracking only — this is not a payroll management system.
      </p>

      <ReportPanel>
        {list.isLoading ? (
          <ReportPanelMessage title="Loading expenses…" />
        ) : list.isError ? (
          <ReportPanelMessage
            title="Expenses unavailable"
            detail={errorText(list.error, "Could not load expenses.")}
            action={<Button variant="outline" size="sm" onClick={() => void list.refetch()}>Try again</Button>}
          />
        ) : rows.length === 0 ? (
          <ReportPanelMessage title={`No expenses in ${label}`} detail={ownOnly ? "Expenses you record this month will appear here." : "Record salaries, bills, supplies and repairs with Add Expense."} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <ReportHeadRow columns={columns} />
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-[var(--cls-border)]" data-testid="expense-row">
                      <TableCell className={reportCellClass}>
                        <CategoryChip category={row.category} label={row.categoryLabel} />
                      </TableCell>
                      <TableCell className={cn(reportCellClass, "font-semibold whitespace-nowrap text-red-700 tabular-nums")}>{amount(row.amount)}</TableCell>
                      <TableCell className={cn(reportCellClass, "whitespace-nowrap text-[var(--cls-muted)]")}>{row.date}</TableCell>
                      <TableCell className={cn(reportCellClass, "max-w-[320px]")}>
                        <p className="truncate" title={row.description}>{row.description}</p>
                        {row.originalCategory ? <p className="mt-0.5 text-xs text-[var(--cls-muted)]">Recorded as “{row.originalCategory}”</p> : null}
                      </TableCell>
                      <TableCell className={cn(reportCellClass, "font-mono text-xs whitespace-nowrap text-[var(--cls-muted)]")}>{row.referenceNo ?? "—"}</TableCell>
                      <TableCell className={cn(reportCellClass, "whitespace-nowrap text-[var(--cls-muted)]")}>{methodLabel(row.paymentMethod) ?? "—"}</TableCell>
                      {manage ? (
                        <TableCell className={cn(reportCellClass, "text-right")}>
                          <RowMenu row={row} onEdit={() => setSheet({ mode: "edit", row })} onDelete={() => setDeleting(row)} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
                {totals ? (
                  <TableFooter>
                    <TableRow className="border-0 bg-[#c0392b] text-white hover:bg-[#c0392b]">
                      <TableCell className="py-3.5 font-semibold">Total</TableCell>
                      <TableCell className="py-3.5 font-semibold tabular-nums" data-testid="expense-footer-total">{amount(totals.total)}</TableCell>
                      <TableCell colSpan={columns.length - 2} />
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </div>
            <ul className="divide-y divide-[var(--cls-border)] md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-1.5 px-4 py-3" data-testid="expense-card">
                  <div className="flex items-center justify-between gap-2">
                    <CategoryChip category={row.category} label={row.categoryLabel} />
                    <span className="font-semibold text-red-700 tabular-nums">{amount(row.amount)}</span>
                  </div>
                  <p className="text-sm break-words text-[var(--cls-ink)]">{row.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--cls-muted)]">
                    <span className="min-w-0 break-all">
                      {row.date}
                      {row.referenceNo ? ` · ${row.referenceNo}` : ""}
                      {row.paymentMethod ? ` · ${methodLabel(row.paymentMethod)}` : ""}
                    </span>
                    {manage ? <RowMenu row={row} onEdit={() => setSheet({ mode: "edit", row })} onDelete={() => setDeleting(row)} /> : null}
                  </div>
                </li>
              ))}
              {totals ? (
                <li className="flex items-center justify-between bg-[#c0392b] px-4 py-3 font-semibold text-white">
                  <span>Total</span>
                  <span className="tabular-nums">{amount(totals.total)}</span>
                </li>
              ) : null}
            </ul>
          </>
        )}
      </ReportPanel>

      <EntrySheet
        open={Boolean(sheet)}
        kind="expense"
        mode={sheet?.mode ?? "add"}
        categories={EXPENSE_CATEGORIES}
        methods={PAYMENT_METHODS}
        initial={sheet?.row ? toValues(sheet.row) : null}
        saving={save.isPending}
        onSubmit={(values) => save.mutate(values)}
        onClose={() => setSheet(null)}
      />
      <DeleteReasonDialog
        open={Boolean(deleting)}
        title="Delete this expense?"
        description={
          deleting ? (
            <>
              {deleting.categoryLabel} of <strong>{pkrAmount(deleting.amount)}</strong> on {deleting.date} will be removed from expenses and the reports. It stays in the audit log.
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

function RowMenu({ row, onEdit, onDelete }: { row: ExpenseRow; onEdit: () => void; onDelete: () => void }) {
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
