import {
  ChevronDown,
  ChevronUp,
  Download,
  MoreVertical,
  Printer,
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
import { classDisplayName } from "@/api/classes/map-class"
import type { ClassRow } from "@/features/management/classes/hooks/use-classes"
import { cn } from "@/lib/utils"

import { ClassStatusBadge } from "./class-status-badge"

type Props = {
  rows: ClassRow[]
  search: string
  onSearchChange: (value: string) => void
  onExport?: () => void
  onPrint?: () => void
  loading?: boolean
  onEdit?: (row: ClassRow) => void
  onDelete?: (id: string) => void
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
  onExport,
  onPrint,
  loading = false,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-[var(--cls-border)] text-[var(--cls-muted)]"
            onClick={onExport}
          >
            <Download data-icon="inline-start" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-[var(--cls-border)] text-[var(--cls-muted)]"
            onClick={onPrint}
          >
            <Printer data-icon="inline-start" />
            Print
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/80 hover:bg-[var(--page-wash)]/80">
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1 uppercase">
                  Class
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1 uppercase">
                  Students
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1 uppercase">
                  Subjects
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Status
              </TableHead>
              <TableHead className="h-12 w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-[var(--cls-muted)]"
                >
                  Loading classes…
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  "border-[var(--cls-border)]",
                  "hover:bg-[var(--page-wash)]/80"
                )}
              >
                <TableCell className="text-sm font-medium text-[var(--cls-ink)]">
                  {classDisplayName(item)}
                </TableCell>
                <TableCell className="text-sm text-[var(--cls-ink)]">
                  {item.studentCount}
                </TableCell>
                <TableCell className="text-sm text-[var(--cls-ink)]">
                  {item.subjectCount}
                </TableCell>
                <TableCell>
                  <ClassStatusBadge status={item.status} />
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
                        <DropdownMenuItem onClick={() => onEdit?.(item)}>
                          Edit class
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete?.(item.id)}
                        >
                          Delete class
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
    </div>
  )
}
