import { Printer } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { type Payment } from "@/data/types"
import {
  FeeMonthTable,
  PrintReceiptButton,
  RecordPaymentForm,
} from "@/features/fees/components"
import { feeMonthsLabel } from "@/features/fees/receipts"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { formatDate, pkr } from "@/lib/format"
import { printDocument } from "@/lib/print"

// ---- accountant (UR-08 / §9) ----------------------------------------------------

/** Accountant portal: record payments and see only your own receipts. No totals anywhere. */
export function AccountantPortal({ section }: { section: string }) {
  if (section === "collections") return <MyCollections />
  return <CollectDesk />
}

function CollectDesk() {
  const { state, confirmPayment } = useSchool()
  const actor = useActor()
  const [last, setLast] = useState<Payment | null>(null)
  const [lookup, setLookup] = useState("")
  const pending = state.payments.filter(
    (payment) => payment.status === "Pending"
  )
  const current = last
    ? (state.payments.find((payment) => payment.ref === last.ref) ?? last)
    : null

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Record payment</CardTitle>
          <CardDescription>
            A receipt number is generated. The oldest unpaid month is always
            cleared first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordPaymentForm onRecorded={setLast} />
        </CardContent>
      </Card>
      <div className="grid content-start gap-5">
        {current ? (
          <Card className="border-[var(--primary-color)]/20">
            <CardHeader>
              <CardTitle>Receipt {current.ref}</CardTitle>
              <CardDescription>
                {studentName(state.students, current.studentId)} ·{" "}
                {current.studentId}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p>
                Fee months:{" "}
                <span className="font-medium">{feeMonthsLabel(current)}</span>
              </p>
              <p>
                Amount received:{" "}
                <span className="font-medium">{pkr(current.amount)}</span> ·{" "}
                {current.method}
              </p>
              <p className="text-muted-foreground">
                {formatDate(current.date)} · recorded by {current.recordedBy}
              </p>
            </CardContent>
            <CardFooter>
              <PrintReceiptButton payment={current} />
            </CardFooter>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Student fee status</CardTitle>
            <CardDescription>
              Month-by-month status before you collect.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Select value={lookup} onValueChange={setLookup}>
              <SelectTrigger>
                <SelectValue placeholder="Choose student" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {state.students
                    .filter((student) => student.status === "Active")
                    .map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} · {student.id}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {lookup ? (
              <div className="max-h-72 overflow-y-auto">
                <FeeMonthTable studentId={lookup} />
              </div>
            ) : null}
          </CardContent>
        </Card>
        {pending.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Bank transfers to confirm</CardTitle>
              <CardDescription>
                Confirming allocates the transfer oldest month first.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {pending.map((payment) => (
                <div
                  key={payment.ref}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {studentName(state.students, payment.studentId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.ref} · {formatDate(payment.date)} ·{" "}
                      {pkr(payment.amount)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const message = confirmPayment(payment.ref, actor)
                      if (message) toast.error(message)
                      else toast.success("Transfer confirmed")
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function MyCollections() {
  const { state } = useSchool()
  const actor = useActor()
  const [day, setDay] = useState(getToday)
  // Only this accountant's own confirmed receipts for the chosen day, no aggregates (§9.2).
  const rows = state.payments.filter(
    (payment) =>
      payment.recordedBy === actor.name &&
      payment.status === "Paid" &&
      payment.date === day
  )

  function printDay() {
    const opened = printDocument(
      `Daily receipts · ${formatDate(day)}`,
      [`Recorded by: ${actor.name}`],
      {
        columns: [
          "Student",
          "Admission ID",
          "Payment date",
          "Fee months",
          "Amount",
          "Receipt no.",
        ],
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

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>My receipts</CardTitle>
            <CardDescription>
              Only payments you recorded. Totals are kept by the super admin.
            </CardDescription>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Day">
              <Input
                type="date"
                value={day}
                max={getToday()}
                onChange={(event) => setDay(event.target.value || getToday())}
              />
            </Field>
            <Button
              variant="outline"
              disabled={!rows.length}
              onClick={printDay}
            >
              <Printer data-icon="inline-start" />
              Print day
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            title="No receipts"
            detail={`You did not record any payments on ${formatDate(day)}.`}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Admission ID</TableHead>
                <TableHead>Payment date</TableHead>
                <TableHead>Fee months</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Receipt no.</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((payment) => (
                <TableRow key={payment.ref}>
                  <TableCell className="font-medium">
                    {studentName(state.students, payment.studentId)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.studentId}
                  </TableCell>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>{feeMonthsLabel(payment)}</TableCell>
                  <TableCell>{pkr(payment.amount)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.ref}
                  </TableCell>
                  <TableCell>
                    <PrintReceiptButton payment={payment} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
