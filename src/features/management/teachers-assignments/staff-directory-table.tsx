import { ChevronDown, ChevronUp, MoreVertical } from "lucide-react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { StaffAvatar } from "./staff-avatar"
import { StaffRoleBadge } from "./staff-role-badge"

type Props = {
  rows: StaffDirectoryRow[]
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  onOpenStaff?: (row: StaffDirectoryRow) => void
  onChangeSubject?: (row: StaffDirectoryRow) => void
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

function displayId(row: StaffDirectoryRow) {
  if (row.employeeCode && row.employeeCode !== "—") return row.employeeCode
  return row.id
}

export function StaffDirectoryTable({
  rows,
  loading = false,
  searchActive = false,
  onClearSearch,
  onOpenStaff,
  onChangeSubject,
  pagination,
}: Props) {
  const showNoMatch = searchActive && !loading && rows.length === 0
  const colSpan = 6

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
              <TableHead className="h-11 w-[72px] px-4 text-xs font-semibold text-[var(--cls-muted)]">
                Id#
              </TableHead>
              <TableHead className="h-11 min-w-[200px] text-xs font-semibold text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  Name
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 min-w-[200px] text-xs font-semibold text-[var(--cls-muted)]">
                Email
              </TableHead>
              <TableHead className="h-11 w-[140px] text-xs font-semibold text-[var(--cls-muted)]">
                Role
              </TableHead>
              <TableHead className="h-11 w-[120px] text-xs font-semibold text-[var(--cls-muted)]">
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
                  Loading staff…
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
            {rows.map((row) => {
              const isTeacher = row.role === "teacher"
              let menu = null
              if (onOpenStaff) {
                menu = (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--cls-muted)]"
                        aria-label="Row actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onOpenStaff(row)}>
                          View profile
                        </DropdownMenuItem>
                        {isTeacher && onChangeSubject ? (
                          <DropdownMenuItem
                            onClick={() => onChangeSubject(row)}
                          >
                            Quick change subject
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              }

              let subjectHint = ""
              if (isTeacher && row.subjectName && row.subjectName !== "—") {
                subjectHint = row.subjectName
              }

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-[var(--cls-border)]",
                    onOpenStaff && "cursor-pointer hover:bg-[var(--page-wash)]/60"
                  )}
                  onClick={() => onOpenStaff?.(row)}
                >
                  <TableCell className="px-4 py-3.5 text-sm tabular-nums text-[var(--cls-muted)]">
                    {displayId(row)}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      <StaffAvatar name={row.name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--cls-ink)]">
                          {row.name}
                        </p>
                        {subjectHint ? (
                          <p className="truncate text-xs text-[var(--cls-muted)]">
                            {subjectHint}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-[var(--cls-muted)]">
                    {row.email}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <StaffRoleBadge role={row.role} />
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
                    {menu}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {pagination && !showNoMatch ? (
        <PaginationComponent pagination={pagination} />
      ) : null}
    </div>
  )
}
