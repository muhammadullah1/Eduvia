import { StatusBadge } from "@/components/app/kit"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { getToday } from "@/lib/dates"
import { feeMonthStatus, monthLabel, outstanding } from "@/lib/fees"
import { formatDate, pkr } from "@/lib/format"

/** Month-by-month fee status for one student (Paid / Partially Paid / Unpaid / Advance). */
export function FeeMonthTable({ studentId }: { studentId: string }) {
  const currentMonth = getToday().slice(0, 7)
  const { state } = useSchool()
  const months = state.feeMonths
    .filter((month) => month.studentId === studentId)
    .sort((a, b) => a.month.localeCompare(b.month))
  if (!months.length)
    return (
      <p className="text-sm text-muted-foreground">
        No fee months generated yet.
      </p>
    )
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {months.map((month) => (
          <TableRow key={month.id}>
            <TableCell className="font-medium">
              {monthLabel(month.month)}
            </TableCell>
            <TableCell>{formatDate(month.dueDate)}</TableCell>
            <TableCell>{pkr(month.amountDue)}</TableCell>
            <TableCell>{pkr(month.amountPaid)}</TableCell>
            <TableCell>{pkr(outstanding(month))}</TableCell>
            <TableCell>
              <StatusBadge value={feeMonthStatus(month, currentMonth)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
