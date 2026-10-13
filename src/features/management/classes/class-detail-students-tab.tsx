import { Search } from "lucide-react"
import { useMemo, useState } from "react"

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
import type { SchoolState, Student } from "@/data/types"
import { cn } from "@/lib/utils"

function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: "active" | "inactive" | "overdue" | "partial" | "paid" | "none"
}) {
  const styles = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-800",
    inactive: "border-[var(--cls-border)] bg-[#f5f5f5] text-[var(--cls-muted)]",
    overdue: "border-red-200 bg-red-50 text-red-700",
    partial: "border-amber-200 bg-amber-50 text-amber-800",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
    none: "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]",
  }
  const dot = {
    active: "bg-emerald-500",
    inactive: "bg-[var(--cls-muted)]",
    overdue: "bg-red-600",
    partial: "bg-amber-500",
    paid: "bg-emerald-500",
    none: "bg-[var(--cls-muted)]",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize",
        styles[tone]
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[tone])} aria-hidden />
      {label}
    </span>
  )
}

function feeLabel(status: StudentFeeUiStatus) {
  if (status === "overdue") return "overdue"
  if (status === "partial") return "partial"
  if (status === "paid") return "paid"
  return "—"
}

type Props = {
  students: Student[]
  feeMonths: SchoolState["feeMonths"]
}

export function ClassDetailStudentsTab({ students, feeMonths }: Props) {
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

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/80 hover:bg-[var(--page-wash)]/80">
              <TableHead className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Student
              </TableHead>
              <TableHead className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Guardian
              </TableHead>
              <TableHead className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Contact
              </TableHead>
              <TableHead className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Status
              </TableHead>
              <TableHead className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Fee
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-[var(--cls-muted)]"
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
                  className="border-[var(--cls-border)] hover:bg-[var(--page-wash)]/80"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--cls-brand)]/10 text-[11px] font-semibold text-[var(--cls-brand)]"
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
                        <p className="text-[10.5px] text-[var(--cls-muted)]">
                          {student.admissionNo ?? student.id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-[var(--cls-ink)]">
                    {student.guardian}
                  </TableCell>
                  <TableCell className="text-[13px] text-[var(--cls-ink)]">
                    {student.phone}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={active ? "active" : "inactive"}
                      tone={active ? "active" : "inactive"}
                    />
                  </TableCell>
                  <TableCell>
                    {fee === "none" ? (
                      <span className="text-[13px] text-[var(--cls-muted)]">
                        —
                      </span>
                    ) : (
                      <StatusPill label={feeLabel(fee)} tone={fee} />
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
