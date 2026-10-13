import {
  ChevronDown,
  ChevronUp,
  Lock,
  MoreVertical,
  Search,
} from "lucide-react"

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
import { formatDate } from "@/lib/format"
import { SessionStatusBadge } from "./session-status-badge"
import type { SessionRow } from "./session-status"

type Props = {
  rows: SessionRow[]
  search: string
  onSearchChange: (value: string) => void
  loading?: boolean
  searchActive?: boolean
  onClearSearch?: () => void
  onActivate?: (id: string) => void
  onEdit?: (row: SessionRow) => void
  onDelete?: (id: string) => void
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

function formatSessionDate(value: string) {
  if (!value) return "—"
  try {
    return formatDate(value)
  } catch {
    return value
  }
}

export function SessionsDataTable({
  rows,
  search,
  onSearchChange,
  loading = false,
  searchActive = false,
  onClearSearch,
  onActivate,
  onEdit,
  onDelete,
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
            placeholder="Search sessions…"
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/80 hover:bg-[var(--page-wash)]/80">
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1 uppercase">
                  Session name
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Start date
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                End date
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Status
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Actions
              </TableHead>
              <TableHead className="h-12 w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 && !showNoMatch ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-sm text-[var(--cls-muted)]"
                >
                  Loading sessions…
                </TableCell>
              </TableRow>
            ) : null}
            {showNoMatch ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
                    <p className="text-sm font-medium text-[var(--cls-ink)]">
                      No sessions match your search
                    </p>
                    <p className="max-w-sm text-sm text-[var(--cls-muted)]">
                      Try a different session name or date, or clear the search
                      to see all sessions.
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
                className="border-[var(--cls-border)] hover:bg-[var(--page-wash)]/80"
              >
                <TableCell className="text-sm font-medium text-[var(--cls-ink)]">
                  <span className="inline-flex items-center gap-2">
                    {row.name}
                    {row.uiStatus === "past" ? (
                      <Lock
                        className="size-3.5 text-[var(--cls-muted)]"
                        aria-label="Locked historical session"
                      />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-[var(--cls-ink)]">
                  {formatSessionDate(row.start)}
                </TableCell>
                <TableCell className="text-sm text-[var(--cls-ink)]">
                  {formatSessionDate(row.end)}
                </TableCell>
                <TableCell>
                  <SessionStatusBadge status={row.uiStatus} />
                </TableCell>
                <TableCell>
                  {row.uiStatus === "current" ? (
                    <span className="text-xs font-medium text-[var(--cls-brand)]">
                      ● Active
                    </span>
                  ) : row.uiStatus === "upcoming" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-[var(--cls-border)] text-xs"
                      onClick={() => onActivate?.(row.id)}
                    >
                      Activate
                    </Button>
                  ) : null}
                </TableCell>
                <TableCell>
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
                        <DropdownMenuItem
                          disabled={row.uiStatus === "past"}
                          onClick={() => onEdit?.(row)}
                        >
                          Edit session
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={row.current || row.uiStatus === "past"}
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete?.(row.id)}
                        >
                          Delete session
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
