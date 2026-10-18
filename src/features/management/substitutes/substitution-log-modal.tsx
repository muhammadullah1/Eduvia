import { Search } from "lucide-react"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ClassSection, Substitution } from "@/data/types"
import { classLabel, formatDate } from "@/lib/format"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  substitutions: Substitution[]
  classes: ClassSection[]
  nameOf: (id: string) => string
}

export function SubstitutionLogModal({
  open,
  onOpenChange,
  substitutions,
  classes,
  nameOf,
}: Props) {
  const [search, setSearch] = useState("")

  const rows = useMemo(() => {
    const sorted = [...substitutions].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.periodIndex - b.periodIndex
    )
    const needle = search.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter((row) => {
      const haystack = [
        row.date,
        nameOf(row.originalTeacherId),
        nameOf(row.substituteTeacherId),
        classLabel(classes, row.classId),
        row.subject,
        row.authorizedBy,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [substitutions, classes, search, nameOf])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-5 text-left">
          <DialogTitle className="text-lg text-[var(--cls-ink)]">
            Substitution log
          </DialogTitle>
          <DialogDescription>
            Date, period, original teacher, substitute, class, subject, and who
            authorised each assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-[var(--cls-border)] px-6 py-3">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search log…"
              className="h-9 border-[var(--cls-border)] bg-[var(--page-wash)] pl-9 text-sm"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="px-6 py-16">
              <EmptyState
                title="No substitutions yet"
                detail="Assignments will appear here after you confirm cover."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Absent teacher
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Substitute
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Period
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Class
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Subject
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    Authorised by
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-[var(--cls-border)]"
                  >
                    <TableCell className="text-sm">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {nameOf(row.originalTeacherId)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-emerald-800">
                      {nameOf(row.substituteTeacherId)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      P{row.periodIndex}
                    </TableCell>
                    <TableCell className="text-sm">
                      {classLabel(classes, row.classId)}
                    </TableCell>
                    <TableCell className="text-sm">{row.subject}</TableCell>
                    <TableCell className="text-sm text-[var(--cls-muted)]">
                      {row.authorizedBy}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--cls-border)] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="border-[var(--cls-border)]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
