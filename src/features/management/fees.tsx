import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CloudUpload, FileSpreadsheet, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"

import feesService, { type FeePaymentDto } from "@/api/fees/fees.service"
import {
  EmptyState,
  Pager,
  SearchField,
  StatusBadge,
} from "@/components/app/kit"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import type { Payment } from "@/data/types"
import { PrintReceiptButton } from "@/features/fees/components"
import { useCan } from "@/lib/access"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { formatDate, pkr } from "@/lib/format"
import { useClientTable } from "@/lib/use-client-table"

import { chartConfig, monthsThroughToday, queryMatch } from "./shared"

const PAYMENTS_KEY = ["fees", "payments"] as const

function feeMonthsLabel(payment: FeePaymentDto) {
  return payment.feeMonths.map((m) => m.label || monthLabel(m.month)).join(", ")
}

/** Maps the fees API payment DTO onto the receipt printer's Payment shape. */
function paymentToPrintShape(payment: FeePaymentDto): Payment {
  return {
    ref: payment.receiptNo,
    studentId: String(payment.student?.id ?? ""),
    amount: payment.amount,
    method: payment.method,
    status: payment.status === "Paid" ? "Paid" : "Pending",
    date: payment.paymentDate?.slice(0, 10) ?? getToday(),
    recordedBy: payment.recordedBy?.name ?? "School Office",
    recordedByRole: "Accountant",
    allocations: payment.feeMonths.map((fm) => ({
      feeMonthId: String(fm.id),
      month: fm.month.slice(0, 7),
      amount: fm.amount,
    })),
    unallocated: Number(payment.unallocatedAmount) || 0,
    mode: payment.allocationMode === "manual" ? "manual" : "auto",
    note: payment.notes ?? undefined,
  }
}

export function Fees({ query }: { query: string }) {
  const actor = useActor()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useCan()
  const canConfirm = can("fees.payments.confirm")
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [ledgerOf, setLedgerOf] = useState<{
    id: number
    name: string
  } | null>(null)
  const search = localQuery || query

  const paymentsQuery = useQuery({
    queryKey: PAYMENTS_KEY,
    queryFn: () => feesService.listPayments(),
  })

  const monthsQuery = useQuery({
    queryKey: ["fees", "months"],
    queryFn: () => feesService.listMonths(),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: number) => feesService.confirmPayment(id),
    onSuccess: async () => {
      toast.success("Payment confirmed and allocated")
      await queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY })
      await queryClient.invalidateQueries({ queryKey: ["fees", "months"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not confirm payment")
    },
  })

  const ledgerStudentId = ledgerOf?.id
  const ledgerQuery = useQuery({
    queryKey: ["fees", "ledger", ledgerStudentId],
    queryFn: () => {
      if (typeof ledgerStudentId !== "number") {
        throw new Error("Student id required")
      }
      return feesService.studentLedger(ledgerStudentId)
    },
    enabled: typeof ledgerStudentId === "number",
  })

  const payments = paymentsQuery.data ?? []
  const rows = payments.filter(
    (payment) =>
      (status === "all" || payment.status === status) &&
      queryMatch(search, [
        payment.receiptNo,
        String(payment.student?.id ?? ""),
        payment.student?.name ?? "",
        payment.student?.admissionNo ?? "",
        feeMonthsLabel(payment),
        payment.recordedBy?.name ?? "",
      ])
  )
  const table = useClientTable(rows, `${search}|${status}|${payments.length}`)

  const feeData = useMemo(() => {
    const start = getToday().slice(0, 7)
    return monthsThroughToday(`${start.slice(0, 4)}-01-01`).map((key) => ({
      month: monthLabel(key).slice(0, 3),
      collection: Math.round(
        payments
          .filter(
            (payment) =>
              payment.paymentDate?.startsWith(key) && payment.status === "Paid"
          )
          .reduce((sum, payment) => sum + payment.amount, 0) / 1000
      ),
      target: Math.round(
        (monthsQuery.data ?? [])
          .filter((month) => month.month?.startsWith(key))
          .reduce((sum, month) => sum + (Number(month.amountDue) || 0), 0) / 1000
      ),
    }))
  }, [monthsQuery.data, payments])

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
              Download the template, fill it offline, then validate and import
              it in Offline Sync. Receipts already in the system are skipped.
            </CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button
              className="flex-1"
              onClick={() => navigate(portalPath(actor.role, "offline-sync"))}
            >
              <CloudUpload data-icon="inline-start" />
              Open Offline Sync
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
            <Button
              onClick={() => navigate(portalPath(actor.role, "collect-fee"))}
            >
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
          {paymentsQuery.isLoading ? (
            <EmptyState title="Loading payments…" detail="Fetching the ledger." />
          ) : paymentsQuery.isError ? (
            <EmptyState
              title="Could not load payments"
              detail="Check your connection and try again."
            />
          ) : table.total === 0 ? (
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
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.receiptNo}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-left font-medium hover:underline"
                        onClick={() =>
                          payment.student
                            ? setLedgerOf({
                                id: payment.student.id,
                                name: payment.student.name,
                              })
                            : undefined
                        }
                      >
                        {payment.student?.name ?? "—"}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {payment.student?.admissionNo ?? ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {formatDate(payment.paymentDate?.slice(0, 10) ?? "")}
                    </TableCell>
                    <TableCell>
                      {feeMonthsLabel(payment) || "—"}
                      {payment.allocationMode === "manual" ? (
                        <Badge variant="secondary" className="ml-2">
                          manual
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell>{payment.recordedBy?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge value={payment.status} />
                    </TableCell>
                    <TableCell>
                      {payment.status === "Pending" && canConfirm ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate(payment.id)}
                        >
                          Confirm
                        </Button>
                      ) : payment.status === "Paid" ? (
                        <PrintReceiptButton
                          payment={paymentToPrintShape(payment)}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pager {...table} onPage={table.setPage} />
      </Card>
      <Dialog
        open={Boolean(ledgerOf)}
        onOpenChange={(value) => !value && setLedgerOf(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ledgerOf?.name ?? "Student"}</DialogTitle>
            <DialogDescription>
              Monthly fee records
              {ledgerOf ? ` for ${ledgerOf.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {ledgerQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading ledger…</p>
            ) : ledgerQuery.isError ? (
              <p className="text-sm text-muted-foreground">
                Could not load this student&apos;s ledger.
              </p>
            ) : !(ledgerQuery.data?.months?.length) ? (
              <p className="text-sm text-muted-foreground">
                No fee months generated yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Fee type</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerQuery.data.months.flatMap((month) =>
                    (month.bills?.length
                      ? month.bills
                      : [
                          {
                            id: Number(month.month.replace(/\D/g, "")) || 0,
                            feeType: "Tuition",
                            due: month.due,
                            paid: month.paid,
                            outstanding: month.outstanding,
                            status: month.status,
                            dueDate: null,
                          },
                        ]
                    ).map((bill) => (
                      <TableRow key={`${month.month}-${bill.id}`}>
                        <TableCell>
                          {month.label || monthLabel(month.month.slice(0, 7))}
                        </TableCell>
                        <TableCell>{bill.feeType}</TableCell>
                        <TableCell>{pkr(bill.due)}</TableCell>
                        <TableCell>{pkr(bill.paid)}</TableCell>
                        <TableCell>
                          <StatusBadge value={bill.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
