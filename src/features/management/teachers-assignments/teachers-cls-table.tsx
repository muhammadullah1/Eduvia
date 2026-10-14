import { ChevronDown, ChevronUp, MoreVertical, Search } from "lucide-react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { StatusChip } from "@/components/app/status-chip"
import {
  PaginationComponent,
  type PaginationWithHandlers,
} from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { ClsSubjectBadge } from "./cls-subject-badge"
import { shortenClassLabel } from "./format-class-label"
import { StaffAvatar } from "./staff-avatar"

type Props = {
  rows: StaffDirectoryRow[]
  search: string
  onSearchChange: (value: string) => void
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  onOpenTeacher?: (row: StaffDirectoryRow) => void
  pagination?: PaginationWithHandlers
}

function SortHint() {
  return (
    <span className="inline-flex flex-col opacity-30">
      <ChevronUp className="size-3" />
      <ChevronDown className="-mt-1 size-3" />
    </span>
  )
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "active") return "success"
  if (normalized === "pending") return "warning"
  return "neutral"
}

function ClassChips({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return (
      <span className="text-sm text-[var(--cls-muted)]">Not scheduled</span>
    )
  }
  const visible = labels.slice(0, 5)
  const overflow = labels.length - visible.length

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((label) => (
        <span
          key={label}
          className="inline-flex rounded-full border border-[var(--cls-border)] bg-[var(--page-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--cls-ink)]"
        >
          {shortenClassLabel(label)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="text-[11px] font-semibold text-[var(--cls-muted)]">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

export function TeachersClsTable({
  rows,
  search,
  onSearchChange,
  loading = false,
  searchActive = false,
  onClearSearch,
  onOpenTeacher,
  pagination,
}: Props) {
  const showNoMatch = searchActive && !loading && rows.length === 0
  const colSpan = 5

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search teachers…"
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
              <TableHead className="h-11 min-w-[220px] text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  Teacher
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 min-w-[140px] text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Assigned subject
              </TableHead>
              <TableHead className="h-11 min-w-[200px] text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Classes taught
              </TableHead>
              <TableHead className="h-11 w-[110px] text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Status
              </TableHead>
              <TableHead className="h-11 w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 && !showNoMatch ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-24 text-center text-sm text-[var(--cls-muted)]"
                >
                  Loading teachers…
                </TableCell>
              </TableRow>
            ) : null}
            {showNoMatch ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                    <p className="text-sm font-medium text-[var(--cls-ink)]">
                      No matches for your search
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClearSearch}
                    >
                      Clear search
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  "border-[var(--cls-border)]",
                  onOpenTeacher && "cursor-pointer hover:bg-[var(--page-wash)]/50"
                )}
                onClick={() => onOpenTeacher?.(row)}
              >
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    <StaffAvatar name={row.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--cls-ink)]">
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-[var(--cls-muted)]">
                        {row.phone}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <ClsSubjectBadge label={row.subjectName} />
                </TableCell>
                <TableCell className="py-3.5">
                  <ClassChips labels={row.classLabels} />
                </TableCell>
                <TableCell className="py-3.5">
                  <StatusChip tone={statusTone(row.status)} showDot>
                    {row.status}
                  </StatusChip>
                </TableCell>
                <TableCell
                  className="py-3.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--cls-muted)]"
                        aria-label="Teacher actions"
                      >
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onOpenTeacher?.(row)}>
                          Edit teacher
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination && !showNoMatch ? (
        <PaginationComponent pagination={pagination} />
      ) : null}
    </div>
  )
}
