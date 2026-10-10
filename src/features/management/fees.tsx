import { CloudUpload, Download, FileSpreadsheet, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"

import {
  EmptyState,
  Pager,
  SearchField,
  StatusBadge,
} from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { studentName, useSchool } from "@/data/store"
import {
  FeeMonthTable,
  PrintReceiptButton,
  RecordPaymentForm,
} from "@/features/fees/components"
import { feeMonthsLabel } from "@/features/fees/receipts"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { formatDate, pkr } from "@/lib/format"
import { useClientTable } from "@/lib/use-client-table"

import { chartConfig, monthsThroughToday, queryMatch } from "./shared"

export function Fees({ query }: { query: string }) {
  const { state, confirmPayment, importWorkbook } = useSchool()
  const actor = useActor()
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [payOpen, setPayOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [ledgerOf, setLedgerOf] = useState("")
  const [fileName, setFileName] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<string[]>([])
  const search = localQuery || query
  const rows = state.payments.filter(
    (payment) =>
      (status === "all" || payment.status === status) &&
      queryMatch(search, [
        payment.ref,
        payment.studentId,
        studentName(state.students, payment.studentId),
        feeMonthsLabel(payment),
        payment.recordedBy,
      ])
  )
  const table = useClientTable(rows, `${search}|${status}`)
  const feeData = useMemo(
    () =>
      monthsThroughToday(
        state.sessions.find((session) => session.current)?.start || getToday()
      ).map((key) => ({
        month: monthLabel(key).slice(0, 3),
        collection: Math.round(
          state.payments
            .filter(
              (payment) =>
                payment.date.startsWith(key) && payment.status === "Paid"
            )
            .reduce((sum, payment) => sum + payment.amount, 0) / 1000
        ),
        target: Math.round(
          state.feeMonths
            .filter((month) => month.month === key)
            .reduce((sum, month) => sum + month.amountDue, 0) / 1000
        ),
      })),
    [state.feeMonths, state.payments, state.sessions]
  )

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Collection against target</CardTitle>
            <CardDescription>
              Paid receipts in thousands of rupees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={feeData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="collection"
                  fill="var(--color-collection)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="target"
                  fill="var(--color-target)"
                  opacity={0.25}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-accent/25 bg-accent/6">
          <CardHeader>
            <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <FileSpreadsheet className="size-5" />
            </div>
            <CardTitle className="mt-4">Offline fee desk</CardTitle>
            <CardDescription>
              Upload the controlled workbook. Each row carries an idempotency
              key, so re-imported rows are skipped and reported.
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => toast.success("Fee template downloaded")}
            >
              <Download data-icon="inline-start" />
              Template
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setReport([])
                setSyncOpen(true)
              }}
            >
              <CloudUpload data-icon="inline-start" />
              Upload
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Ledger</CardTitle>
              <CardDescription>
                Every receipt, who recorded it and the fee months it cleared.
              </CardDescription>
            </div>
            <Button onClick={() => setPayOpen(true)}>
              <Plus data-icon="inline-start" />
              Record payment
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField
              value={localQuery}
              onChange={setLocalQuery}
              placeholder="Search receipt, student or month"
            />
            <div className="sm:w-44">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {table.total === 0 ? (
            <EmptyState
              title="No payments"
              detail="Record a payment or change the filter."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fee months</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.slice.map((payment) => (
                  <TableRow key={payment.ref}>
                    <TableCell className="font-mono text-xs">
                      {payment.ref}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-left font-medium hover:underline"
                        onClick={() => setLedgerOf(payment.studentId)}
                      >
                        {studentName(state.students, payment.studentId)}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {payment.studentId}
                      </p>
                    </TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>
                      {feeMonthsLabel(payment)}
                      {payment.mode === "manual" ? (
                        <Badge variant="secondary" className="ml-2">
                          manual
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell>{payment.recordedBy}</TableCell>
                    <TableCell>
                      <StatusBadge value={payment.status} />
                    </TableCell>
                    <TableCell>
                      {payment.status === "Pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const message = confirmPayment(payment.ref, actor)
                            if (message) toast.error(message)
                            else
                              toast.success("Payment confirmed and allocated")
                          }}
                        >
                          Confirm
                        </Button>
                      ) : (
                        <PrintReceiptButton payment={payment} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pager {...table} onPage={table.setPage} />
      </Card>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Record fee payment</DialogTitle>
            <DialogDescription>
              A receipt number is generated. The oldest unpaid month is cleared
              first unless you record an explicit allocation.
            </DialogDescription>
          </DialogHeader>
          <RecordPaymentForm onRecorded={() => setPayOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(ledgerOf)}
        onOpenChange={(value) => !value && setLedgerOf("")}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{studentName(state.students, ledgerOf)}</DialogTitle>
            <DialogDescription>
              Monthly fee records for {ledgerOf}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <FeeMonthTable studentId={ledgerOf} />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Synchronise offline fees</DialogTitle>
            <DialogDescription>
              Every row is validated. Duplicates stay out of the ledger.
            </DialogDescription>
          </DialogHeader>
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-6 text-center">
            <CloudUpload className="size-5" />
            <span className="mt-3 text-sm font-medium">
              {fileName || "Choose .xlsx workbook"}
            </span>
            <Input
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name ?? "")
              }
            />
          </label>
          {syncing ? (
            <p className="text-sm text-muted-foreground">Validating rows…</p>
          ) : null}
          {report.length ? (
            <Alert>
              <AlertTitle>Import report</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc pl-4">
                  {report.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncOpen(false)}>
              Close
            </Button>
            <Button
              disabled={syncing}
              onClick={() => {
                setSyncing(true)
                window.setTimeout(() => {
                  const result = importWorkbook(fileName, actor)
                  setSyncing(false)
                  if (typeof result === "string") toast.error(result)
                  else {
                    setReport([
                      `${result.imported} imported`,
                      `${result.skipped} skipped`,
                      `${result.failed} failed`,
                      ...result.notes,
                    ])
                    toast.success("Workbook processed")
                  }
                }, 700)
              }}
            >
              Validate & import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
