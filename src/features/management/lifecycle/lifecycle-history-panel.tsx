import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import lifecycleService, {
  LIFECYCLE_HISTORY_QUERY_KEY,
  type LifecycleEvent,
  type LifecycleEventType,
} from "@/api/students/lifecycle.service"
import downloadIcon from "@/assets/enrollment/download.svg"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import { lifecycleToCsv } from "./lifecycle-csv"
import {
  emptyHistoryFilters,
  EVENT_LABELS,
  EVENT_TONES,
  EVENT_TYPES,
  eventDetail,
  type HistoryFilters,
  historyParams,
  REASON_CATEGORIES,
} from "./lifecycle-rules"
import { ClassPicker, SessionPicker } from "./lifecycle-shared"

const ALL = "all"

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Append-only lifecycle history: promotions, status events and enrollments, filtered on the server. */
export function LifecycleHistoryPanel() {
  const [filters, setFilters] = useState<HistoryFilters>(emptyHistoryFilters)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [exporting, setExporting] = useState(false)
  const q = useDebounced(search.trim())
  const effective = { ...filters, q }

  const sessions = useSessionsList().data ?? []
  const classSession = filters.sessionId || (sessions.find((s) => s.current)?.id ?? "")
  const classes = useClassesList(classSession ? Number(classSession) : undefined).data ?? []

  const update = (patch: Partial<HistoryFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }
  const dirty = Object.values(filters).some(Boolean) || Boolean(search)

  const query = useQuery({
    queryKey: [LIFECYCLE_HISTORY_QUERY_KEY, effective, page, pageSize],
    placeholderData: keepPreviousData,
    queryFn: () => lifecycleService.history(historyParams(effective, page, pageSize)),
  })
  const events = query.data?.events ?? []
  const pagination = query.data?.pagination ?? { total: 0, page, pageSize, totalPages: 0 }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const all: LifecycleEvent[] = []
      for (let next = 1; ; next += 1) {
        const data = await lifecycleService.history(historyParams(effective, next, 200))
        all.push(...data.events)
        if (next >= data.pagination.totalPages) break
      }
      const url = URL.createObjectURL(new Blob([lifecycleToCsv(all)], { type: "text/csv" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `lifecycle-history-${new Date().toLocaleDateString("en-CA")}.csv`
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
        title="Lifecycle history"
        description="Every enrollment, promotion and status change, newest first. Entries are never edited or deleted."
        actions={
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} disabled={exporting || !events.length}>
            <img src={downloadIcon} alt="" width={12} height={12} />
            {exporting ? "Exporting…" : `Export CSV${pagination.total ? ` (${pagination.total})` : ""}`}
          </Button>
        }
      />
      <div className="grid gap-2 border-b border-[var(--cls-border)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Student name or admission no."
            className="pl-9"
            aria-label="Search student"
          />
        </div>
        <Select value={filters.type || ALL} onValueChange={(value) => update({ type: value === ALL ? "" : (value as LifecycleEventType) })}>
          <SelectTrigger className="w-full border-[var(--cls-border)]" aria-label="Event type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All events</SelectItem>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {EVENT_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.reasonCategory || ALL}
          onValueChange={(value) => update({ reasonCategory: value === ALL ? "" : value })}
        >
          <SelectTrigger className="w-full border-[var(--cls-border)]" aria-label="Reason category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All reasons</SelectItem>
            {REASON_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SessionPicker
          id="history-session"
          value={filters.sessionId}
          onChange={(value) => update({ sessionId: value, classId: "" })}
          sessions={sessions}
        />
        <ClassPicker
          id="history-class"
          value={filters.classId}
          onChange={(value) => update({ classId: value })}
          classes={classes}
          placeholder="Any class"
        />
        <DatePicker
          value={filters.from}
          onChange={(value) => update({ from: value })}
          placeholder="From date"
          defaultMonthKind="today"
          aria-label="From date"
          maxDate={filters.to || undefined}
        />
        <DatePicker
          value={filters.to}
          onChange={(value) => update({ to: value })}
          placeholder="To date"
          defaultMonthKind="today"
          aria-label="To date"
          fromDate={filters.from || undefined}
        />
        <Button
          variant="ghost"
          className="justify-self-start text-[var(--cls-muted)]"
          disabled={!dirty}
          onClick={() => {
            setFilters(emptyHistoryFilters)
            setSearch("")
            setPage(1)
          }}
        >
          <X data-icon="inline-start" />
          Clear filters
        </Button>
      </div>
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
        <ClsEmpty title={dirty ? "No events match these filters" : "No lifecycle changes yet"}>
          {dirty
            ? "Try a wider date range or clear the filters."
            : "Status changes, promotions and enrollments appear here with who recorded them."}
        </ClsEmpty>
      ) : (
        <Table className={cn("table-fixed", query.isFetching && "opacity-70")}>
          <TableHeader>
            <TableRow className={clsHeadRowClass}>
              <ClsTh className="w-[110px]">Date</ClsTh>
              <ClsTh className="w-[20%]">Student</ClsTh>
              <ClsTh className="w-[140px]">Event</ClsTh>
              <ClsTh>Details</ClsTh>
              <ClsTh className="w-[22%]">Reason</ClsTh>
              <ClsTh className="w-[130px]">Recorded by</ClsTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} className={clsRowClass}>
                <TableCell className="text-sm whitespace-nowrap text-[var(--cls-muted)]">{formatDate(event.date)}</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-[var(--cls-ink)]">{event.student?.name ?? "—"}</span>
                    {event.student?.admissionNo ? (
                      <span className="truncate font-mono text-[11px] text-[var(--cls-muted)]">{event.student.admissionNo}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusChip tone={EVENT_TONES[event.type] ?? "neutral"} showDot>
                    {EVENT_LABELS[event.type] ?? event.type}
                  </StatusChip>
                </TableCell>
                <TableCell className="text-sm whitespace-normal text-[var(--cls-ink)]">
                  <span className="line-clamp-2">{eventDetail(event) || "—"}</span>
                  {event.session ? <span className="block text-[11px] text-[var(--cls-muted)]">{event.session}</span> : null}
                </TableCell>
                <TableCell className="text-sm whitespace-normal text-[var(--cls-muted)]">
                  <span className="line-clamp-2" title={event.reason ?? undefined}>
                    {event.reason || "—"}
                  </span>
                </TableCell>
                <TableCell className="truncate text-sm text-[var(--cls-muted)]">{event.recordedBy ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
