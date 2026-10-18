import { Search } from "lucide-react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { StatusChip } from "@/components/app/status-chip"
import {
  PaginationComponent,
  type PaginationWithHandlers,
} from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { StaffRoleBadge } from "./staff-role-badge"

type Props = {
  rows: StaffDirectoryRow[]
  search: string
  onSearchChange: (value: string) => void
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  pagination?: PaginationWithHandlers
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "active") return "success"
  if (normalized === "pending") return "warning"
  return "neutral"
}

export function OfficeStaffTable({
  rows,
  search,
  onSearchChange,
  loading = false,
  searchActive = false,
  onClearSearch,
  pagination,
}: Props) {
  const showNoMatch = searchActive && !loading && rows.length === 0

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="border-b border-[var(--cls-border)] px-4 py-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search office accounts…"
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
            <TableHead className="text-xs font-semibold text-[var(--cls-muted)]">
              Name
            </TableHead>
            <TableHead className="text-xs font-semibold text-[var(--cls-muted)]">
              Role
            </TableHead>
            <TableHead className="text-xs font-semibold text-[var(--cls-muted)]">
              Email
            </TableHead>
            <TableHead className="text-xs font-semibold text-[var(--cls-muted)]">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 && !showNoMatch ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-sm text-[var(--cls-muted)]">
                Loading…
              </TableCell>
            </TableRow>
          ) : null}
          {showNoMatch ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                <Button type="button" variant="outline" size="sm" onClick={onClearSearch}>
                  Clear search
                </Button>
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={row.id} className="border-[var(--cls-border)]">
              <TableCell className="text-sm font-medium text-[var(--cls-ink)]">
                {row.name}
              </TableCell>
              <TableCell>
                <StaffRoleBadge role={row.role} />
              </TableCell>
              <TableCell className="text-sm text-[var(--cls-muted)]">
                {row.email}
              </TableCell>
              <TableCell>
                <StatusChip tone={statusTone(row.status)} showDot>
                  {row.status}
                </StatusChip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && !showNoMatch ? (
        <PaginationComponent pagination={pagination} />
      ) : null}
    </div>
  )
}
