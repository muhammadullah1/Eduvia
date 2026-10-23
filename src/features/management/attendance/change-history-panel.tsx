import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ArrowRight, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

import attendanceReviewService, { ATTENDANCE_REVIEW_KEY, type ChangeHistoryParams } from "@/api/attendance/attendance-review.service"
import { ClsEmpty, ClsPanel, ClsPanelHeader } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { stampOf, STATUS_LABELS, STATUS_TONES } from "./attendance-rules"
import { ClassSelect, LoadError, LoadingRows } from "./attendance-shared"

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Change History: every change to a saved mark, newest first. Rows are never edited or deleted. */
export function ChangeHistoryPanel() {
  const [search, setSearch] = useState("")
  const [classId, setClassId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const q = useDebounced(search.trim())
  const params: ChangeHistoryParams = {
    q: q || undefined,
    classId: classId ? Number(classId) : undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize,
  }
  const query = useQuery({
    queryKey: [ATTENDANCE_REVIEW_KEY, "changes", params],
    placeholderData: keepPreviousData,
    queryFn: () => attendanceReviewService.changes(params),
  })
  const data = query.data
  const dirty = Boolean(search || classId || from || to)
  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value)
    setPage(1)
  }

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Change history"
        description="Every change to saved attendance is permanently logged here: what changed, why, who made it and when."
        actions={data ? <span className="text-xs font-medium text-[var(--cls-muted)]">{data.total} {data.total === 1 ? "change" : "changes"}</span> : null}
      />
      <div className="grid gap-2 border-b border-[var(--cls-border)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(event) => reset(setSearch)(event.target.value)}
            placeholder="Student name or admission no."
            className="pl-9"
            aria-label="Search student"
          />
        </div>
        <ClassSelect id="history-class" value={classId} onChange={reset(setClassId)} allowAll />
        <DatePicker value={from} onChange={reset(setFrom)} placeholder="From date" defaultMonthKind="today" aria-label="From date" maxDate={to || undefined} />
        <DatePicker value={to} onChange={reset(setTo)} placeholder="To date" defaultMonthKind="today" aria-label="To date" fromDate={from || undefined} />
        <Button
          variant="ghost"
          className="justify-self-start text-[var(--cls-muted)]"
          disabled={!dirty}
          onClick={() => {
            setSearch("")
            setClassId("")
            setFrom("")
            setTo("")
            setPage(1)
          }}
        >
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
      {query.isError ? (
        <LoadError what="the change history" onRetry={() => void query.refetch()} />
      ) : query.isLoading || !data ? (
        <LoadingRows label="Loading change history" />
      ) : !data.changes.length ? (
        <ClsEmpty title={dirty ? "No changes match these filters" : "No attendance changes yet"}>
          {dirty ? "Try a wider date range or clear the filters." : "When a saved mark is changed, the change and its reason appear here."}
        </ClsEmpty>
      ) : (
        <ol className={cn("flex flex-col px-4 py-2", query.isFetching && "opacity-70")} aria-label="Attendance changes">
          {data.changes.map((change, index) => (
            <li key={change.id} className="relative flex gap-3 py-3">
              {index < data.changes.length - 1 ? (
                <span className="absolute top-8 bottom-0 left-[11px] w-px bg-[var(--cls-border)]" aria-hidden />
              ) : null}
              <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                <span className="size-2 rounded-full bg-[var(--cls-brand)]" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <p className="text-sm font-medium text-[var(--cls-ink)]">
                    {change.studentName}
                    <span className="font-normal text-[var(--cls-muted)]">
                      {" "}
                      · {change.classLabel ?? "No class"} · {formatDate(change.date)}
                    </span>
                  </p>
                  <time className="text-xs text-[var(--cls-muted)] tabular-nums" dateTime={change.changedAt}>
                    {stampOf(change.changedAt)}
                  </time>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {change.from ? <StatusChip tone={STATUS_TONES[change.from]}>{STATUS_LABELS[change.from]}</StatusChip> : <StatusChip>Not marked</StatusChip>}
                  <ArrowRight className="size-3.5 text-[var(--cls-muted)]" aria-label="changed to" />
                  <StatusChip tone={STATUS_TONES[change.to]} showDot>
                    {STATUS_LABELS[change.to]}
                  </StatusChip>
                  <span className="text-xs text-[var(--cls-muted)]">
                    by {change.actor?.name ?? "Unknown user"}
                    {change.source === "register" ? " (teacher re-marked the register)" : change.source === "created" ? " (record created from the review page)" : ""}
                  </span>
                </div>
                {change.reason ? <p className="text-xs text-[var(--cls-muted)] italic">Reason: {change.reason}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
      <PaginationComponent
        pagination={{
          total: data?.total ?? 0,
          page,
          pageSize,
          totalPages: data ? Math.ceil(data.total / data.pageSize) : 0,
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
