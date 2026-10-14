import { ChevronDown, ChevronUp, Search } from "lucide-react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { staffRoleLabel } from "@/api/staff/map-staff-directory"
import {
  PaginationComponent,
  type PaginationWithHandlers,
} from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import type { Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { StaffAvatar } from "./staff-avatar"
import { StaffRoleBadge } from "./staff-role-badge"

export type StaffRoleFilter = "all" | Role

type Props = {
  rows: StaffDirectoryRow[]
  search: string
  onSearchChange: (value: string) => void
  roleFilter: StaffRoleFilter
  onRoleFilterChange: (value: StaffRoleFilter) => void
  roleOptions: Role[]
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  onOpenUser?: (row: StaffDirectoryRow) => void
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

export function StaffDirectoryTable({
  rows,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  loading = false,
  searchActive = false,
  onClearSearch,
  onOpenUser,
  pagination,
}: Props) {
  const showNoMatch = searchActive && !loading && rows.length === 0
  const colSpan = 2

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative w-full max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or email…"
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
        <div className="w-full lg:w-[200px]">
          <Label className="mb-1.5 block text-xs font-medium text-[var(--cls-muted)]">
            Role
          </Label>
          <Select
            value={roleFilter}
            onValueChange={(value) =>
              onRoleFilterChange(value as StaffRoleFilter)
            }
          >
            <SelectTrigger className="h-10 border-[var(--cls-border)] bg-[var(--page-wash)]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {staffRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
              <TableHead className="h-11 min-w-[280px] text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  User
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 w-[180px] text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                Role
              </TableHead>
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
                      No matches for your filters
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
                  onOpenUser && "cursor-pointer hover:bg-[var(--page-wash)]/50"
                )}
                onClick={() => onOpenUser?.(row)}
              >
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    <StaffAvatar name={row.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--cls-ink)]">
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-[var(--cls-muted)]">
                        {row.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5">
                  <StaffRoleBadge role={row.role} />
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
