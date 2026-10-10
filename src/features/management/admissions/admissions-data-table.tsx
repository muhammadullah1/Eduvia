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
import type { Application, ClassSection } from "@/data/types"
import { classLabel, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { AdmissionStatusBadge } from "./admission-status-badge"
import {
  formatRegistrationNo,
  resolveAdmissionUiStatus,
} from "./admission-display"

type Props = {
  rows: Application[]
  classes: ClassSection[]
  search: string
  onSearchChange: (value: string) => void
  onOpen: (app: Application) => void
  onExport?: () => void
  onPrint?: () => void
  /** When true, omits outer card chrome (used inside AdmissionsPanel). */
  embedded?: boolean
}

function SortHint() {
  return (
    <span className="inline-flex flex-col opacity-30">
      <ChevronUp className="size-3" />
      <ChevronDown className="-mt-1 size-3" />
    </span>
  )
}

export function AdmissionsDataTable({
  rows,
  classes,
  search,
  onSearchChange,
  onOpen,
  onExport,
  onPrint,
  embedded = false,
}: Props) {
  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white"
          : "overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
      }
    >
      <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, reg. no., class…"
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
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Reg. No.
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1 uppercase">
                  Applicant
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)]">
                <span className="inline-flex items-center gap-1 uppercase">
                  Applying For
                  <SortHint />
                </span>
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Guardian
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Submitted
              </TableHead>
              <TableHead className="h-12 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                Status
              </TableHead>
              <TableHead className="h-12 w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => {
              const uiStatus = resolveAdmissionUiStatus(item)
              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "cursor-pointer border-[var(--cls-border)]",
                    "hover:bg-[var(--page-wash)]/80"
                  )}
                  onClick={() => onOpen(item)}
                >
                  <TableCell className="font-mono text-xs text-[var(--cls-muted)]">
                    {formatRegistrationNo(item.id)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-[var(--cls-ink)]">
                        {item.name}
                      </span>
                      <span className="text-xs text-[var(--cls-muted)]">
                        {formatDate(item.dob)} · {item.gender}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-ink)]">
                    {classLabel(classes, item.classId)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-[var(--cls-ink)]">
                        {item.guardian}
                      </span>
                      <span className="text-xs text-[var(--cls-muted)]">
                        {item.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-ink)]">
                    {item.submittedOn ? formatDate(item.submittedOn) : "—"}
                  </TableCell>
                  <TableCell>
                    <AdmissionStatusBadge status={uiStatus} />
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
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
                          <DropdownMenuItem onClick={() => onOpen(item)}>
                            View application
                          </DropdownMenuItem>
                          <DropdownMenuItem>Print form</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
