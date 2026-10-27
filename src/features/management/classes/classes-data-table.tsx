import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Search,
} from "lucide-react"

import { classDisplayName } from "@/api/classes/map-class"
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
import type { ClassRow } from "@/features/management/classes/hooks/use-classes"
import { cn } from "@/lib/utils"

import { ClassStatusBadge } from "./class-status-badge"

type Props = {
  rows: ClassRow[]
  search: string
  onSearchChange: (value: string) => void
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  onOpenClass?: (row: ClassRow) => void
  onEdit?: (row: ClassRow) => void
  onDelete?: (id: string) => void
  onRestore?: (id: string) => void
  restoringId?: string | null
  archivedView?: boolean
  /** When true, the parent renders search (e.g. Settings archives). */
  hideSearch?: boolean
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

export function ClassesDataTable({
  rows,
  search,
  onSearchChange,
  loading = false,
  searchActive = false,
  onClearSearch,
  onOpenClass,
  onEdit,
  onDelete,
  onRestore,
  restoringId = null,
  archivedView = false,
  hideSearch = false,
  pagination,
}: Props) {
  const showNoMatch = searchActive && !loading && rows.length === 0

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      {hideSearch ? null : (
        <div className="border-b border-[var(--cls-border)] px-4 py-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search classes…"
              className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  Class
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  Students
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1">
                  Subjects
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-11 text-xs font-semibold text-[var(--cls-muted)]">
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
                  Loading classes…
                </TableCell>
              </TableRow>
            ) : null}
            {showNoMatch ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                    <p className="text-sm font-medium text-[var(--cls-ink)]">
                      No classes match your search
                    </p>
                    <p className="max-w-sm text-sm text-[var(--cls-muted)]">
                      Try another class name or section, or clear the search to
                      see all classes.
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
                  onOpenClass && "cursor-pointer hover:bg-[var(--page-wash)]/80"
                )}
                onClick={() => onOpenClass?.(item)}
              >
                <TableCell className="py-3.5 text-sm font-medium text-[var(--cls-ink)]">
                  {classDisplayName(item)}
                </TableCell>
                <TableCell className="py-3.5 text-sm tabular-nums text-[var(--cls-ink)]">
                  {item.studentCount}
                </TableCell>
                <TableCell className="py-3.5 text-sm tabular-nums text-[var(--cls-ink)]">
                  {item.subjectCount}
                </TableCell>
                <TableCell className="py-3.5">
                  <ClassStatusBadge status={item.status} />
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        {archivedView ? (
                          <DropdownMenuItem
                            disabled={restoringId === item.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onRestore?.(item.id)
                            }}
                          >
                            {restoringId === item.id
                              ? "Restoring…"
                              : "Restore class"}
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit?.(item)
                              }}
                            >
                              Edit class
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={item.studentCount > 0}
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete?.(item.id)
                              }}
                            >
                              Archive class
                            </DropdownMenuItem>
                            {item.studentCount > 0 ? (
                              <p className="max-w-56 px-2 pb-1.5 text-xs text-[var(--cls-muted)]">
                                Has {item.studentCount} enrolled{" "}
                                {item.studentCount === 1 ? "student" : "students"}. Move or withdraw them first.
                              </p>
                            ) : null}
                          </>
                        )}
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
