import { toast } from "sonner"

import type { Payment, SchoolState } from "@/data/types"
import { monthLabel } from "@/lib/fees"
import { classLabel, formatDate, pkr } from "@/lib/format"
import { printDocument } from "@/lib/print"

export function feeMonthsLabel(payment: Payment) {
  return payment.allocations.map((line) => monthLabel(line.month)).join(", ") || (payment.status === "Pending" ? "Awaiting confirmation" : "Unallocated")
}

/** Individual receipt (§9): no running totals, just this payment. */
export function printReceipt(state: SchoolState, payment: Payment) {
  const student = state.students.find((item) => item.id === payment.studentId)
  const opened = printDocument(`Fee receipt ${payment.ref}`, [
    `Student: ${student?.name ?? payment.studentId} (${payment.studentId})`,
    `Class: ${student ? classLabel(state.classes, student.classId) : "—"}`,
    `Payment date: ${formatDate(payment.date)} · Method: ${payment.method}`,
    `Recorded by: ${payment.recordedBy}`,
  ], {
    columns: ["Fee month", "Amount allocated"],
    rows: [
      ...payment.allocations.map((line) => [monthLabel(line.month), pkr(line.amount)]),
      ...(payment.unallocated ? [["Held as credit", pkr(payment.unallocated)]] : []),
      ["Amount received", pkr(payment.amount)],
    ],
  })
  if (!opened) toast.error("Allow pop-ups to print the receipt.")
}
