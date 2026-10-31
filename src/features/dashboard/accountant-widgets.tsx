import type { GenerationWidget, ImportBatchRow, ReceiptRow } from "@/api/dashboard/dashboard.service"
import { StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { pkrAmount } from "@/features/finance/format"

import { methodLabel } from "./dashboard-format"
import { WidgetCard, WidgetEmpty } from "./widget-card"

/** Today's own receipts as rows only (BR-11: no totals); printing lives on My daily receipts. */
export function MyReceiptsToday({ rows, onOpen }: { rows: ReceiptRow[]; onOpen: (section: string) => void }) {
  return (
    <WidgetCard
      title="My receipts today"
      className="lg:col-span-2"
      testId="dash-my-receipts"
      action={<Button size="sm" variant="outline" onClick={() => onOpen("collections")}>Print sheet</Button>}
    >
      {!rows.length && <WidgetEmpty>You have not recorded a payment today.</WidgetEmpty>}
      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="hidden sm:table-cell">Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.receiptNo}</TableCell>
                <TableCell className="max-w-40 whitespace-normal">
                  <span className="block font-medium">{row.studentName}</span>
                  <span className="text-xs text-muted-foreground">{row.feeMonths.join(", ")}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{methodLabel(row.method)}</TableCell>
                <TableCell className="text-right">{pkrAmount(row.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </WidgetCard>
  )
}

export function GenerationStatus({ status, onOpen }: { status: GenerationWidget; onOpen: (section: string) => void }) {
  return (
    <WidgetCard title="Bill generation" description={status.label} testId="dash-generation">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Active</dt>
          <dd className="font-heading text-xl font-semibold">{status.activeStudents}</dd>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Billed</dt>
          <dd className="font-heading text-xl font-semibold">{status.billed}</dd>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Not billed</dt>
          <dd className="font-heading text-xl font-semibold" data-testid="dash-not-billed">{status.notBilled}</dd>
        </div>
      </dl>
      {status.notBilled > 0 && (
        <Button className="mt-4 w-full" onClick={() => onOpen("fee-generation")}>Generate {status.label}</Button>
      )}
    </WidgetCard>
  )
}

export function MyImports({ rows, onOpen }: { rows: ImportBatchRow[]; onOpen: (section: string) => void }) {
  return (
    <WidgetCard
      title="My offline imports"
      testId="dash-my-imports"
      action={<button type="button" className="text-sm font-medium text-primary" onClick={() => onOpen("offline-sync")}>Open</button>}
    >
      {!rows.length && <WidgetEmpty>No import batches uploaded yet.</WidgetEmpty>}
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{row.fileName}</span>
              <span className="text-xs text-muted-foreground">{row.importedRows}/{row.totalRows} rows · {row.errorRows} errors</span>
            </span>
            <StatusBadge value={row.status} />
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}
