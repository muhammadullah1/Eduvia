import { Printer } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import feeReportsService from "@/api/fees/fee-reports.service"
import { Field } from "@/components/app/kit"
import {
  ExportButtons,
  reportCellClass,
  ReportHeadRow,
  ReportPanel,
  ReportPanelMessage,
} from "@/components/app/report-layout"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { studentName, useSchool } from "@/data/store"
import { CollectFeePage } from "@/features/fees/collect"
import { PrintReceiptButton } from "@/features/fees/components"
import { OfflineSyncPage } from "@/features/fees/offline-sync"
import { feeMonthsLabel } from "@/features/fees/receipts"
import { AccountantExpensesPage } from "@/features/finance/finance-page"
import { FeeStructurePage, MonthlyGenerationPage } from "@/features/management/screens"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useReportDownload } from "@/hooks/use-report-download"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { formatDate, pkr } from "@/lib/format"
import { printDocument } from "@/lib/print"
import { cn } from "@/lib/utils"

const RECEIPT_COLUMNS = [
  { key: "student", label: "Student" },
  { key: "admission", label: "Admission ID" },
  { key: "date", label: "Payment date" },
  { key: "months", label: "Fee months" },
  { key: "amount", label: "Amount", numeric: true },
  { key: "receipt", label: "Receipt no." },
]

// ---- accountant (UR-08 / §9) ----------------------------------------------------

/** Accountant portal: record payments and see only your own receipts. No totals anywhere. */
export function AccountantPortal({ section }: { section: string }) {
  if (section === "collections") return <MyCollections />
  if (section === "fee-structure") return <FeeStructurePage />
  if (section === "fee-generation") return <MonthlyGenerationPage />
  if (section === "expenses") return <AccountantExpensesPage />
  if (section === "offline-sync") return <OfflineSyncPage />
  return <CollectFeePage />
}

function MyCollections() {
  const { state } = useSchool()
  const actor = useActor()
  const [day, setDay] = useState(getToday)
  // Only this accountant's own confirmed receipts for the chosen day, no aggregates (§9.2).
  const rows = useMemo(
    () =>
      state.payments.filter(
        (payment) =>
          payment.recordedBy === actor.name &&
          payment.status === "Paid" &&
          payment.date === day
      ),
    [state.payments, actor.name, day]
  )
  const { paginatedItems, pagination } = useClientPagination(rows)
  const { busy, run } = useReportDownload()

  function printDay() {
    const opened = printDocument(
      `Daily receipts · ${formatDate(day)}`,
      [`Recorded by: ${actor.name}`],
      {
        columns: RECEIPT_COLUMNS.map((c) => c.label),
        rows: rows.map((payment) => [
          studentName(state.students, payment.studentId),
          payment.studentId,
          formatDate(payment.date),
          feeMonthsLabel(payment),
          pkr(payment.amount),
          payment.ref,
        ]),
      }
    )
    if (!opened) toast.error("Allow pop-ups to print the day sheet.")
  }

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <Field label="Day">
        <DatePicker
          value={day}
          maxDate={getToday()}
          onChange={(value) => setDay(value || getToday())}
          placeholder="Receipt day"
          defaultMonthKind="today"
          className="w-full sm:w-44"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-[var(--cls-border)] bg-white"
          disabled={!rows.length}
          onClick={printDay}
        >
          <Printer data-icon="inline-start" />
          Print day
        </Button>
        {/* Server-built file of the same rows (own receipts only, no totals). */}
        <ExportButtons
          busy={busy}
          disabled={!rows.length}
          onExport={(format) =>
            void run(format, () =>
              feeReportsService.download("daily", { from: day, to: day }, format)
            )
          }
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--cls-muted)]">
        Only payments you recorded. Totals are kept by the super admin.
      </p>
      <ReportPanel toolbar={toolbar} pagination={rows.length ? pagination : undefined}>
        {rows.length === 0 ? (
          <ReportPanelMessage
            title="No receipts"
            detail={`You did not record any payments on ${formatDate(day)}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <ReportHeadRow columns={[...RECEIPT_COLUMNS, { key: "actions", label: "" }]} />
              </TableHeader>
              <TableBody>
                {paginatedItems.map((payment) => (
                  <TableRow key={payment.ref} className="border-[var(--cls-border)]">
                    <TableCell className={cn(reportCellClass, "font-medium")}>
                      {studentName(state.students, payment.studentId)}
                    </TableCell>
                    <TableCell className={cn(reportCellClass, "font-mono text-xs")}>
                      {payment.studentId}
                    </TableCell>
                    <TableCell className={reportCellClass}>{formatDate(payment.date)}</TableCell>
                    <TableCell className={reportCellClass}>{feeMonthsLabel(payment)}</TableCell>
                    <TableCell className={cn(reportCellClass, "text-right tabular-nums")}>
                      {pkr(payment.amount)}
                    </TableCell>
                    <TableCell className={cn(reportCellClass, "font-mono text-xs")}>
                      {payment.ref}
                    </TableCell>
                    <TableCell className={cn(reportCellClass, "text-right")}>
                      <PrintReceiptButton payment={payment} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportPanel>
    </div>
  )
}
