import { BadgeCheck, Printer, ReceiptText, WalletCards } from "lucide-react"

import { EmptyState, MetricCard, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FeeMonthTable } from "@/features/fees/components"
import { feeMonthsLabel, printReceipt } from "@/features/fees/receipts"
import { getToday } from "@/lib/dates"
import { feeMonthStatus, monthLabel, outstanding } from "@/lib/fees"
import { formatDate, pkr } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"
import { unpaidMonths } from "./visibility"

export function ParentFees() {
  const { state, child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const payments = state.payments.filter(
    (payment) => payment.studentId === child.id
  )
  const unpaid = unpaidMonths(state, child.id)
  const balance = unpaid.reduce((sum, month) => sum + outstanding(month), 0)
  const paidMonths = state.feeMonths.filter(
    (month) =>
      month.studentId === child.id &&
      ["Paid", "Advance"].includes(feeMonthStatus(month, currentMonth))
  ).length
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <ChildSwitcher
          childId={childId}
          onChange={setChildId}
          options={options}
        />
      </div>
      {unpaid.length === 0 ? (
        <Alert className="border-success/20 bg-success/5">
          <BadgeCheck className="size-4 text-success" />
          <AlertTitle>All clear</AlertTitle>
          <AlertDescription>
            No month is outstanding for {child.name}.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>
            {unpaid.length} {unpaid.length === 1 ? "month" : "months"} unpaid
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 grid gap-1">
              {unpaid.map((month) => (
                <li key={month.id} className="flex items-center gap-2">
                  {monthLabel(month.month)} · {pkr(outstanding(month))}{" "}
                  <StatusBadge value={feeMonthStatus(month, currentMonth)} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Payments are always applied to the oldest unpaid month first.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard
          icon={WalletCards}
          label="Balance due"
          value={pkr(balance)}
          note={
            unpaid.map((month) => monthLabel(month.month)).join(", ") ||
            "Nothing due"
          }
          tone="accent"
        />
        <MetricCard
          icon={ReceiptText}
          label="Months paid"
          value={String(paidMonths)}
          note={`${payments.filter((payment) => payment.status === "Paid").length} receipts on record`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Monthly fee status</CardTitle>
          <CardDescription>
            Paid, partially paid, unpaid or paid in advance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeeMonthTable studentId={child.id} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Receipt history</CardTitle>
          <CardDescription>Read-only family view</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState
              title="No receipts"
              detail="Payments recorded for this child will be listed here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Fee months</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.ref}>
                    <TableCell className="font-mono text-xs">
                      {payment.ref}
                    </TableCell>
                    <TableCell>{feeMonthsLabel(payment)}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge value={payment.status} />
                    </TableCell>
                    <TableCell>
                      {payment.status === "Paid" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Print receipt"
                          onClick={() => printReceipt(state, payment)}
                        >
                          <Printer />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
