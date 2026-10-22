import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import promotionsService, {
  type EnrollmentEvent,
  type EnrollmentEventType,
  PROMOTION_HISTORY_QUERY_KEY,
} from "@/api/students/promotions.service"
import downloadIcon from "@/assets/enrollment/download.svg"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip, type StatusChipTone } from "@/components/app/status-chip"
import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { historyToCsv } from "./history-csv"

const ALL = "all"
const TYPES: EnrollmentEventType[] = ["Promotion", "Repeat", "Graduation", "New Admission"]
const TONES: Record<EnrollmentEventType, StatusChipTone> = {
  Promotion: "success",
  Repeat: "warning",
  Graduation: "brand",
  "New Admission": "neutral",
}

export function HistoryPanel() {
  const [type, setType] = useState(ALL)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [exporting, setExporting] = useState(false)
  const filter = type === ALL ? undefined : (type as EnrollmentEventType)

  const query = useQuery({
    queryKey: [PROMOTION_HISTORY_QUERY_KEY, filter, page, pageSize],
    placeholderData: keepPreviousData,
    queryFn: () => promotionsService.history({ type: filter, page, pageSize }),
  })
  const events = query.data?.events ?? []
  const pagination = query.data?.pagination ?? { total: 0, page, pageSize, totalPages: 0 }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const all: EnrollmentEvent[] = []
      for (let next = 1; ; next += 1) {
        const data = await promotionsService.history({ type: filter, page: next, pageSize: 200 })
        all.push(...data.events)
        if (next >= data.pagination.totalPages) break
      }
      const url = URL.createObjectURL(new Blob([historyToCsv(all)], { type: "text/csv" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `enrollment-history-${new Date().toLocaleDateString("en-CA")}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error("Export failed", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setExporting(false)
    }
  }

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Enrollment history"
        description="Every promotion, hold-back, graduation and new admission, newest first."
        actions={
          <>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value)
                setPage(1)
              }}
            >
              <SelectTrigger size="sm" className="w-40 border-[var(--cls-border)]" aria-label="Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting || !events.length}>
              <img src={downloadIcon} alt="" width={12} height={12} />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </>
        }
      />
      {query.isError ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-base font-medium text-[var(--cls-ink)]">Could not load history</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.isLoading ? (
        <div className="flex flex-col gap-2 p-4" aria-label="Loading history">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : !events.length ? (
        <ClsEmpty title="No enrollment changes yet">
          Promotions and enrollments you make appear here with who recorded them.
        </ClsEmpty>
      ) : (
        <div className="overflow-x-auto">
          <Table className={cn(query.isFetching && "opacity-70")}>
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh>Date</ClsTh>
                <ClsTh>Student</ClsTh>
                <ClsTh>From</ClsTh>
                <ClsTh>To</ClsTh>
                <ClsTh>Session</ClsTh>
                <ClsTh>Type</ClsTh>
                <ClsTh>Recorded by</ClsTh>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className={clsRowClass}>
                  <TableCell className="text-sm whitespace-nowrap text-[var(--cls-muted)]">{formatDate(event.date)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-[var(--cls-ink)]">{event.student?.name ?? "—"}</span>
                      {event.student?.admissionNo ? (
                        <span className="font-mono text-[11px] text-[var(--cls-muted)]">{event.student.admissionNo}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-muted)]">{event.fromClass ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium text-[var(--cls-ink)]">
                    {event.toClass ?? (event.type === "Graduation" ? "Graduated" : "—")}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-muted)]">{event.session ?? "—"}</TableCell>
                  <TableCell>
                    <StatusChip tone={TONES[event.type]} showDot>
                      {event.type === "Repeat" ? "Held back" : event.type}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-muted)]">{event.recordedBy ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <PaginationComponent
        pagination={{
          ...pagination,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
      />
    </ClsPanel>
  )
}
