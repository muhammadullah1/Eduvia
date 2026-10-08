import { useMemo, useState } from "react"
import { Printer } from "lucide-react"
import { toast } from "sonner"

import { Field, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSchool } from "@/data/store"
import type { Payment } from "@/data/types"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { feeMonthStatus, monthLabel, outstanding, planOldestFirst } from "@/lib/fees"
import { classLabel, formatDate, pkr } from "@/lib/format"
import { can } from "@/lib/permissions"
import { feeMonthsLabel, printReceipt } from "@/features/fees/receipts"

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Month-by-month fee status for one student (Paid / Partially Paid / Unpaid / Advance). */
export function FeeMonthTable({ studentId }: { studentId: string }) {
  const currentMonth = getToday().slice(0, 7)
  const { state } = useSchool()
  const months = state.feeMonths.filter((month) => month.studentId === studentId).sort((a, b) => a.month.localeCompare(b.month))
  if (!months.length) return <p className="text-sm text-muted-foreground">No fee months generated yet.</p>
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Due date</TableHead><TableHead>Fee</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {months.map((month) => (
          <TableRow key={month.id}>
            <TableCell className="font-medium">{monthLabel(month.month)}</TableCell>
            <TableCell>{formatDate(month.dueDate)}</TableCell>
            <TableCell>{pkr(month.amountDue)}</TableCell>
            <TableCell>{pkr(month.amountPaid)}</TableCell>
            <TableCell>{pkr(outstanding(month))}</TableCell>
            <TableCell><StatusBadge value={feeMonthStatus(month, currentMonth)} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Record a payment. The preview shows exactly how the amount will be applied
 * (oldest unpaid month first). Only the super admin may switch to an explicit
 * allocation; the store rejects it for anyone else.
 */
export function RecordPaymentForm({ onRecorded }: { onRecorded?: (payment: Payment) => void }) {
  const { state, recordPayment } = useSchool()
  const actor = useActor()
  const [studentId, setStudentId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [date, setDate] = useState(getToday)
  const [note, setNote] = useState("")
  const [manual, setManual] = useState(false)
  const [lines, setLines] = useState<Record<string, string>>({})
  const [key, setKey] = useState(newKey)
  const [error, setError] = useState("")
  const canManual = can(actor.role, "fees.payments.allocate_manual")
  const students = state.students.filter((student) => student.status === "Active")
  const open = useMemo(() => state.feeMonths.filter((month) => month.studentId === studentId && outstanding(month) > 0).sort((a, b) => a.month.localeCompare(b.month)), [state.feeMonths, studentId])
  const value = Number(amount)
  const preview = Number.isFinite(value) && value > 0 ? planOldestFirst(open, value) : null

  function submit() {
    const allocations = manual ? Object.entries(lines).map(([feeMonthId, raw]) => ({ feeMonthId, amount: Number(raw) })).filter((line) => line.amount > 0) : undefined
    const result = recordPayment({ studentId, amount: value, method, date, note, idempotencyKey: key, allocations }, actor)
    if ("error" in result) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    if (result.duplicate) toast.message(`Already recorded as ${result.payment.ref} — duplicate blocked`)
    else toast.success(`Receipt ${result.payment.ref} · ${feeMonthsLabel(result.payment)}`)
    setError("")
    setAmount("")
    setNote("")
    setLines({})
    setManual(false)
    setKey(newKey())
    onRecorded?.(result.payment)
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Student" error={error}>
            <Select value={studentId} onValueChange={(next) => { setStudentId(next); setLines({}); setError("") }}>
              <SelectTrigger aria-invalid={Boolean(error)}><SelectValue placeholder="Choose student" /></SelectTrigger>
              <SelectContent><SelectGroup>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name} · {student.id} · {classLabel(state.classes, student.classId)}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Amount (PKR)"><Input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="8500" /></Field>
        <Field label="Payment date"><Input type="date" value={date} max={getToday()} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Method">
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>{["Cash", "Bank transfer", "Cheque"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
        <Field label="Note (optional)"><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Paid by father" /></Field>
      </div>

      {studentId ? (
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{manual ? "Explicit allocation" : "Allocation preview · oldest unpaid month first"}</p>
            {canManual && open.length ? <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={manual} onCheckedChange={setManual} />Allocate manually</label> : null}
          </div>
          {open.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nothing is due. The payment will be applied to upcoming months as Advance.</p> : (
            <div className="mt-3 grid gap-2">
              {open.map((month) => {
                const line = preview?.lines.find((item) => item.feeMonthId === month.id)
                return (
                  <div key={month.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">{monthLabel(month.month)} <StatusBadge value={feeMonthStatus(month, getToday().slice(0, 7))} /></span>
                    <span className="text-muted-foreground">balance {pkr(outstanding(month))}</span>
                    {manual ? (
                      <Input className="h-8 w-28" inputMode="numeric" value={lines[month.id] ?? ""} onChange={(event) => setLines({ ...lines, [month.id]: event.target.value.replace(/[^0-9]/g, "") })} placeholder="0" />
                    ) : (
                      <span className="w-28 text-right font-medium">{line ? pkr(line.amount) : "—"}</span>
                    )}
                  </div>
                )
              })}
              {!manual && preview?.leftover ? <p className="text-xs text-muted-foreground">{pkr(preview.leftover)} beyond the open months will pre-pay upcoming months (Advance).</p> : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex justify-end"><Button onClick={submit} disabled={!studentId || !value}>Record payment</Button></div>
    </div>
  )
}

export function PrintReceiptButton({ payment }: { payment: Payment }) {
  const { state } = useSchool()
  return <Button size="sm" variant="outline" onClick={() => printReceipt(state, payment)}><Printer data-icon="inline-start" />Receipt</Button>
}
