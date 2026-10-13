import { ChevronDown, ChevronUp, MoreVertical, Search } from "lucide-react"

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
import {
  PaginationComponent,
  type PaginationWithHandlers,
} from "@/components/common/pagination-component"
import type { SubjectRow } from "@/api/subjects/map-subject"
import { StatusChip } from "@/components/app/status-chip"
import { ClassStatusBadge } from "@/features/management/classes/class-status-badge"
import { SubjectClassTags } from "@/features/management/subjects/subject-class-tags"
import { cn } from "@/lib/utils"

export type SubjectTableRow = SubjectRow & {
  classLabels: string[]
}

type Props = {
  rows: SubjectTableRow[]
  search: string
  onSearchChange: (value: string) => void
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  onEdit?: (row: SubjectTableRow) => void
  onToggleActive?: (row: SubjectTableRow) => void
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

export function SubjectsDataTable({
  rows,
  search,
  onSearchChange,
  loading = false,
  searchActive = false,
  onClearSearch,
  onEdit,
  onToggleActive,
  pagination,
}: Props) {
  const showNoMatch = searchActive && !loading && rows.length === 0

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="border-b border-[var(--cls-border)] px-4 py-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
              <TableHead className="h-11 min-w-[160px] text-xs font-semibold text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  Subject
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 w-[100px] text-xs font-semibold text-[var(--cls-muted)]">
                Code
              </TableHead>
              <TableHead className="h-11 min-w-[200px] text-xs font-semibold text-[var(--cls-muted)]">
                Classes
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
                  colSpan={5}
                  className="h-24 text-center text-sm text-[var(--cls-muted)]"
                >
                  Loading subjects…
                </TableCell>
              </TableRow>
            ) : null}
            {showNoMatch ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                    <p className="text-sm font-medium text-[var(--cls-ink)]">
                      No subjects match your search
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
            {rows.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  "border-[var(--cls-border)]",
                  item.status === "Inactive" && "opacity-70"
                )}
              >
                <TableCell className="py-3.5 text-sm font-medium text-[var(--cls-ink)]">
                  {item.name}
                </TableCell>
                <TableCell className="py-3.5">
                  <span className="inline-flex rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--cls-ink)]">
                    {item.code}
                  </span>
                </TableCell>
                <TableCell className="py-3.5">
                  <SubjectClassTags labels={item.classLabels} />
                </TableCell>
                <TableCell className="py-3.5">
                  {item.status === "Active" ? (
                    <ClassStatusBadge status="Active" />
                  ) : (
                    <StatusChip tone="neutral">Inactive</StatusChip>
                  )}
                </TableCell>
                <TableCell className="py-3.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--cls-muted)]"
                        aria-label="Row actions"
                      >
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onEdit?.(item)}>
                          Edit subject
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleActive?.(item)}
                        >
                          {item.status === "Active"
                            ? "Deactivate"
                            : "Activate"}
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
