import { Search } from "lucide-react"
import { useMemo, useState } from "react"

import { StatusChip, type StatusChipTone } from "@/components/app/status-chip"
import { PaginationComponent } from "@/components/common/pagination-component"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  studentFeeStatus,
  studentIsActive,
  type StudentFeeUiStatus,
} from "@/features/management/classes/use-class-detail"
import { useClientPagination } from "@/hooks/use-client-pagination"
import type { FeeMonth, Student } from "@/data/types"

function feeTone(status: StudentFeeUiStatus): StatusChipTone {
  if (status === "overdue") return "danger"
  if (status === "partial") return "warning"
  if (status === "paid") return "success"
  return "neutral"
}

function feeLabel(status: StudentFeeUiStatus) {
  if (status === "overdue") return "Overdue"
  if (status === "partial") return "Partial"
  if (status === "paid") return "Paid"
  return "—"
}

type Props = {
  students: Student[]
  feeMonths: FeeMonth[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

export function ClassDetailStudentsTab({
  students,
  feeMonths,
  loading,
  error,
  onRetry,
}: Props) {
  const [search, setSearch] = useState("")
  const needle = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return students
    return students.filter((s) =>
      [s.name, s.guardian, s.phone, s.admissionNo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [students, needle])

  const { paginatedItems, pagination } = useClientPagination(filtered)

  if (loading && students.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-14 text-center text-sm text-[var(--cls-muted)]">
        Loading students…
      </div>
    )
  }

  if (error && students.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 px-6 py-10 text-center">
        <p className="text-sm font-medium text-[var(--cls-ink)]">
          Could not load students
        </p>
        {onRetry ? (
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-[var(--cls-brand)]"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[var(--cls-border)] px-4 py-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/80 hover:bg-[var(--page-wash)]/80">
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                Student
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                Guardian
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                Contact
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                Status
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                Fee
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-28 text-center text-sm text-[var(--cls-muted)]"
                >
                  {students.length === 0
                    ? "No students enrolled in this class yet."
                    : "No students match your search."}
                </TableCell>
              </TableRow>
            ) : null}
            {paginatedItems.map((student) => {
              const fee = studentFeeStatus(student.id, feeMonths)
              const active = studentIsActive(student)
              return (
                <TableRow
                  key={student.id}
                  className="border-[var(--cls-border)] hover:bg-[var(--page-wash)]/60"
                >
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--cls-brand)]/10 text-[11px] font-semibold text-[var(--cls-brand)]"
                        aria-hidden
                      >
                        {student.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[var(--cls-ink)]">
                          {student.name}
                        </p>
                        <p className="text-xs text-[var(--cls-muted)]">
                          {student.admissionNo ?? student.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] text-[var(--cls-ink)]">
                    {student.guardian || "—"}
                  </TableCell>
                  <TableCell className="py-3.5 text-[13px] text-[var(--cls-ink)]">
                    {student.phone || "—"}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <StatusChip
                      tone={active ? "success" : "neutral"}
                      showDot
                    >
                      {active ? "Active" : student.status}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {fee === "none" ? (
                      <span className="text-[13px] text-[var(--cls-muted)]">
                        —
                      </span>
                    ) : (
                      <StatusChip tone={feeTone(fee)}>
                        {feeLabel(fee)}
                      </StatusChip>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {filtered.length > 0 ? (
        <PaginationComponent pagination={pagination} />
      ) : null}
    </div>
  )
}
