import { useQuery } from "@tanstack/react-query"
import { Play, Printer } from "lucide-react"
import { type ReactNode, useMemo, useState } from "react"

import studentReportsService, {
  STUDENT_LIST_REPORT,
  STUDENT_REPORT_KINDS,
  STUDENT_STATUS_OPTIONS,
  type StudentReportFilters,
  type StudentReportKind,
} from "@/api/reports/student-reports.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Field } from "@/components/app/kit"
import {
  ExportButtons,
  reportCellClass,
  ReportHeadRow,
  ReportPanel,
  ReportPanelMessage,
} from "@/components/app/report-layout"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { SummaryCards } from "@/features/management/fee-reports"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { usePrintBrand } from "@/hooks/use-print-brand"
import { useReportDownload } from "@/hooks/use-report-download"
import { getToday } from "@/lib/dates"
import { addMonths } from "@/lib/fees"
import { isNumeric, printReport, reportCell } from "@/lib/report-format"
import { useUrlTab } from "@/lib/use-url-tab"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10
const TREND_MONTHS = 12
const ALL = "all"
const MONTH_KEY_LENGTH = 7
const KIND_VALUES = STUDENT_REPORT_KINDS.map((item) => item.kind)
type Applied = { kind: StudentReportKind; filters: StudentReportFilters }

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return "Could not load the report."
}

/**
 * Student reports from `/reports/students/:kind` (SRS §8): student list, admission trend,
 * class distribution, status and promotion records. Super Admin and Operations Manager
 * (students.manage); no fee figures, so nothing to redact between them.
 */
export function StudentReportsPanel() {
  const { state } = useSchool()
  const brand = usePrintBrand().report
  const today = getToday()
  const [tab, setTab] = useUrlTab(KIND_VALUES, "subtab")
  const meta = STUDENT_REPORT_KINDS.find((item) => item.kind === tab) ?? STUDENT_LIST_REPORT
  const kind = meta.kind
  const [from, setFrom] = useState(() => `${addMonths(today.slice(0, MONTH_KEY_LENGTH), 1 - TREND_MONTHS)}-01`)
  const [to, setTo] = useState(today)
  const [classId, setClassId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const filters = useMemo(() => {
    const next: StudentReportFilters = {}
    if (meta.range) Object.assign(next, { from, to })
    if (meta.classFilter) next.classId = classId
    if (meta.statusFilter) next.status = status
    return next
  }, [meta, from, to, classId, status])
  const [applied, setApplied] = useState<Applied>({ kind, filters })
  const active = applied.kind === kind
  const dirty = active && JSON.stringify(applied.filters) !== JSON.stringify(filters)
  let rangeError: string | undefined
  if (meta.range && to < from) rangeError = "The end date must be on or after the start date."

  const report = useQuery({
    queryKey: ["student-report", applied.kind, applied.filters],
    queryFn: () => studentReportsService.get(applied.kind, applied.filters),
    enabled: active,
  })
  const { busy, run } = useReportDownload()
  const data = active ? report.data : undefined
  const rows = useMemo(() => data?.rows ?? [], [data])
  const { paginatedItems, pagination } = useClientPagination(rows, { initialPageSize: PAGE_SIZE })
  const classes = useMemo(() => [...state.classes].sort((a, b) => a.label.localeCompare(b.label)), [state.classes])
  const canExport = Boolean(data) && !dirty

  function selectKind(value: string) {
    const next = STUDENT_REPORT_KINDS.find((item) => item.kind === value)
    if (!next) return
    setTab(next.kind)
    const nextFilters: StudentReportFilters = {}
    if (next.range) Object.assign(nextFilters, { from, to })
    if (next.classFilter) nextFilters.classId = classId
    if (next.statusFilter) nextFilters.status = status
    setApplied({ kind: next.kind, filters: nextFilters })
  }
  function generate() {
    if (!rangeError) setApplied({ kind, filters })
  }

  let body: ReactNode = <ReportPanelMessage title="Loading report…" />
  if (report.isError) body = <ReportPanelMessage title="Report unavailable" detail={errorMessage(report.error)} />
  else if (data && rows.length === 0) body = <ReportPanelMessage title="Nothing to show" detail="No records match these filters." />
  else if (data) {
    body = (
      <>
        {dirty && (
          <p className="border-b border-[var(--cls-border)] bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
            Filters changed. Click Generate Report to refresh the table and exports.
          </p>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <ReportHeadRow columns={data.columns.map((c) => ({ key: c.key, label: c.label, numeric: isNumeric(c) }))} />
            </TableHeader>
            <TableBody>
              {paginatedItems.map((row, i) => (
                <TableRow key={`${pagination.page}-${i}`} className="border-[var(--cls-border)]">
                  {data.columns.map((c) => (
                    <TableCell key={c.key} className={cn(reportCellClass, "whitespace-nowrap", isNumeric(c) && "text-right tabular-nums")}>
                      {reportCell(row[c.key], c.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    )
  }

  let heading = meta.label
  if (data) heading = `${data.title} — ${data.meta.map(([, value]) => value).join(" · ")}`

  const toolbar = (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {meta.range && (
          <>
            <Field label="From" error={rangeError}>
              <DatePicker value={from} onChange={setFrom} maxDate={today} defaultMonthKind="today" aria-label="From date" className="w-full lg:w-44" />
            </Field>
            <Field label="To">
              <DatePicker value={to} onChange={setTo} maxDate={today} defaultMonthKind="today" aria-label="To date" className="w-full lg:w-44" />
            </Field>
          </>
        )}
        {meta.classFilter && (
          <Field label="Class">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger aria-label="Class" className="w-full border-[var(--cls-border)] bg-white lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {meta.statusFilter && (
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Status" className="w-full border-[var(--cls-border)] bg-white lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STUDENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Button type="button" onClick={generate} disabled={Boolean(rangeError)} className="sm:col-span-2 lg:col-span-1">
          <Play data-icon="inline-start" />
          Generate Report
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ExportButtons
          busy={busy}
          disabled={!canExport}
          onExport={(format) => void run(format, () => studentReportsService.download(applied.kind, applied.filters, format))}
        />
        <Button
          type="button"
          variant="outline"
          className="border-[var(--cls-border)] bg-white"
          disabled={!canExport}
          onClick={() => data && printReport(data, brand)}
        >
          <Printer data-icon="inline-start" />
          Print
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="student-reports">
      <ClsSubTabs
        items={STUDENT_REPORT_KINDS.map((item) => ({ value: item.kind, label: item.label }))}
        value={kind}
        onValueChange={selectKind}
        aria-label="Student reports"
        wrap
      />
      <div>
        <h2 className="text-base font-semibold text-[var(--cls-ink)]" data-testid="student-report-heading">{heading}</h2>
        <p className="mt-0.5 text-sm text-[var(--cls-muted)]">{meta.detail}</p>
      </div>
      {data?.summary?.length && <SummaryCards summary={data.summary} />}
      <ReportPanel toolbar={toolbar} pagination={data && rows.length ? pagination : undefined}>
        {body}
      </ReportPanel>
    </div>
  )
}
