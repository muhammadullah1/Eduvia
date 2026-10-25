import { useQuery } from "@tanstack/react-query"
import { BarChart3, Play, Printer } from "lucide-react"
import { useMemo, useState } from "react"

import feeReportsService, {
  FEE_REPORT_KINDS,
  FEE_REPORT_TABS,
  type FeeReport,
  type FeeReportColumn,
  type FeeReportFilters,
  type FeeReportKind,
} from "@/api/fees/fee-reports.service"
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
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useReportDownload } from "@/hooks/use-report-download"
import { getToday } from "@/lib/dates"
import { printDocument } from "@/lib/print"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10
const isNumeric = (column: FeeReportColumn) =>
  column.type === "money" || column.type === "number" || column.type === "percent"

function reportCell(value: string | number | null | undefined, type?: string) {
  if (value === null || value === undefined || value === "") return "—"
  if (type === "money") return Number(value).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  if (type === "percent") return `${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 1 })}%`
  return String(value)
}

type Applied = { kind: FeeReportKind; filters: FeeReportFilters }

/** Every row (not just the visible page) with the filters and totals, through the portal print window. */
function printReport(report: FeeReport) {
  const lines = [
    ...report.meta.map(([label, value]) => `${label}: ${value}`),
    ...(report.summary ?? []).map(([label, value]) => `${label}: ${value}`),
  ]
  return printDocument(report.title, lines, {
    columns: report.columns.map((c) => c.label),
    rows: report.rows.map((row) => report.columns.map((c) => reportCell(row[c.key], c.type))),
  })
}

/**
 * Fee reports from `/fees/reports/:kind` (Figma "Fee Reports", node 124-40648): six
 * sub-tabs, Date / Month and Class filters, Generate Report, Excel / CSV / PDF and
 * Print. Super Admin sees every report with totals; the accountant only their own
 * daily receipts and never a total (the API returns no summary for them).
 */
export function FeeReportsPanel({ kinds }: { kinds: FeeReportKind[] }) {
  const { state } = useSchool()
  const today = getToday()
  const tabs = useMemo(
    () => FEE_REPORT_TABS.map((t) => ({ ...t, kinds: t.kinds.filter((k) => kinds.includes(k)) })).filter((t) => t.kinds.length),
    [kinds]
  )
  const [tab, setTab] = useState(tabs[0]?.value ?? "daily")
  const current = tabs.find((t) => t.value === tab) ?? tabs[0]
  const [kind, setKind] = useState<FeeReportKind>(current?.kinds[0] ?? "daily")
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [classId, setClassId] = useState("all")
  const [applied, setApplied] = useState<Applied | null>(
    kinds[0] === "daily" ? { kind: "daily", filters: { from: today, to: today, classId: "all" } } : null
  )
  const { busy, run } = useReportDownload()
  const meta = FEE_REPORT_KINDS.find((k) => k.kind === kind) ?? FEE_REPORT_KINDS[0]
  const filters: FeeReportFilters = useMemo(
    () => (meta.range === "days" ? { from, to, classId } : { month, classId }),
    [meta.range, from, to, month, classId]
  )
  const rangeError = meta.range === "days" && to < from ? "The end date must be on or after the start date." : undefined
  const active = applied?.kind === kind ? applied : null
  const dirty = Boolean(active) && JSON.stringify(active?.filters) !== JSON.stringify(filters)
  const report = useQuery({
    queryKey: ["fee-report", active?.kind, active?.filters],
    queryFn: () => (active ? feeReportsService.get(active.kind, active.filters) : Promise.reject(new Error("No report"))),
    enabled: Boolean(active),
  })
  const classes = useMemo(() => [...state.classes].sort((a, b) => a.label.localeCompare(b.label)), [state.classes])
  const data = active ? report.data : undefined
  const rows = useMemo(() => data?.rows ?? [], [data])
  const { paginatedItems, pagination } = useClientPagination(rows, { initialPageSize: PAGE_SIZE })
  const ownOnly = kinds.length === 1 && kinds[0] === "daily"

  function selectKind(next: FeeReportKind) {
    setKind(next)
    // Daily opens on today's receipts (as in Figma); the others wait for Generate Report.
    setApplied(next === "daily" ? { kind: next, filters: { from, to, classId } } : null)
  }
  function selectTab(value: string) {
    setTab(value)
    const next = tabs.find((t) => t.value === value)
    if (next) selectKind(next.kinds[0])
  }
  const generate = () => {
    if (!rangeError) setApplied({ kind, filters })
  }

  const toolbar = (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {meta.range === "days" ? (
          <>
            <Field label="From" error={rangeError}>
              <DatePicker value={from} onChange={setFrom} maxDate={today} defaultMonthKind="today" aria-label="From date" className="w-full lg:w-44" />
            </Field>
            <Field label="To">
              <DatePicker value={to} onChange={setTo} maxDate={today} defaultMonthKind="today" aria-label="To date" className="w-full lg:w-44" />
            </Field>
          </>
        ) : (
          <Field label="Month">
            <MonthPicker value={month} onChange={setMonth} monthsBack={24} monthsAhead={6} aria-label="Month" className="w-full lg:w-48" />
          </Field>
        )}
        <Field label="Class">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger aria-label="Class" className="w-full border-[var(--cls-border)] bg-white lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="button" onClick={generate} disabled={Boolean(rangeError)} className="sm:col-span-2 lg:col-span-1">
          <Play data-icon="inline-start" />
          Generate Report
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ExportButtons
          busy={busy}
          disabled={!data || dirty}
          onExport={(format) => active && void run(format, () => feeReportsService.download(active.kind, active.filters, format))}
        />
        <Button
          type="button"
          variant="outline"
          className="border-[var(--cls-border)] bg-white"
          disabled={!data || dirty}
          onClick={() => data && printReport(data)}
        >
          <Printer data-icon="inline-start" />
          Print
        </Button>
      </div>
    </div>
  )

  const heading = data
    ? `${data.title} — ${data.meta
        .filter(([label]) => label !== "Note" && label !== "Scope")
        .map(([, value]) => value)
        .join(" · ")}`
    : meta.label

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="fee-reports">
      {tabs.length > 1 ? <ClsSubTabs items={tabs} value={current.value} onValueChange={selectTab} aria-label="Fee reports" wrap /> : null}

      {current && current.kinds.length > 1 ? (
        <ClsSubTabs
          items={current.kinds.map((k) => ({ value: k, label: FEE_REPORT_KINDS.find((m) => m.kind === k)?.label ?? k }))}
          value={kind}
          onValueChange={(value) => selectKind(value as FeeReportKind)}
          aria-label="Report view"
        />
      ) : null}

      <div>
        <h2 className="text-base font-semibold text-[var(--cls-ink)]" data-testid="fee-report-heading">{heading}</h2>
        <p className="mt-0.5 text-sm text-[var(--cls-muted)]">
          {ownOnly ? "Receipts you recorded. Totals are kept by the Super Admin." : meta.detail}
        </p>
      </div>

      {data?.summary?.length ? <SummaryCards summary={data.summary} /> : null}

      <ReportPanel toolbar={toolbar} pagination={data && rows.length ? pagination : undefined}>
        {!active ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" data-testid="fee-report-empty">
            <span className="flex size-11 items-center justify-center rounded-full bg-[var(--brand-100)] text-[var(--primary-color)]">
              <BarChart3 className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--cls-ink)]">Apply filters and click Generate Report</p>
              <p className="mt-1 text-sm text-[var(--cls-muted)]">
                Select a {meta.range === "days" ? "date range" : "month"} and class to populate this report.
              </p>
            </div>
            <Button type="button" onClick={generate} disabled={Boolean(rangeError)}>
              Generate Report
            </Button>
          </div>
        ) : report.isError ? (
          <ReportPanelMessage
            title="Report unavailable"
            detail={report.error instanceof Error ? report.error.message : "Could not load the report."}
          />
        ) : report.isLoading ? (
          <ReportPanelMessage title="Loading report…" />
        ) : data && rows.length === 0 ? (
          <ReportPanelMessage title="Nothing to show" detail="No records match these filters." />
        ) : data ? (
          <>
            {dirty ? (
              <p className="border-b border-[var(--cls-border)] bg-amber-50 px-4 py-2 text-xs text-amber-800" role="status">
                Filters changed. Click Generate Report to refresh the table and exports.
              </p>
            ) : null}
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
        ) : null}
      </ReportPanel>
    </div>
  )
}

const METHOD_LABELS = ["Cash", "Bank transfer", "Cheque", "Online"] as const
const methodOf = (label: string) => METHOD_LABELS.find((m) => label === `${m} (PKR)`)
const money = (value: string | number) => Number(value).toLocaleString("en-PK", { maximumFractionDigits: 2 })
const cardClass = "rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"

/**
 * Summary tiles. Per-method collection totals (Cash, Bank transfer, Cheque, Online) are
 * folded into one "Collections by method" tile so the row stays at four cards; the API
 * summary (and the exported files) are unchanged.
 */
function SummaryCards({ summary }: { summary: [string, string | number][] }) {
  const methods = summary.filter(([label]) => methodOf(label))
  const others = summary.filter(([label]) => !methodOf(label))
  const methodTotal = methods.reduce((total, [, value]) => total + Math.round(Number(value || 0) * 100), 0) / 100
  const totalCards = others.length + (methods.length ? 1 : 0)
  const gridCols =
    totalCards === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : totalCards === 4
        ? "grid-cols-2 lg:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"

  return (
    <div className={cn("grid gap-3", gridCols)} aria-label="Summary">
      {others.map(([label, value]) => (
        <div key={label} className={cardClass}>
          <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--cls-ink)]">{String(value)}</p>
        </div>
      ))}
      {methods.length ? (
        <div className={cardClass} data-testid="summary-methods">
          <p className="text-xs font-medium text-[var(--cls-muted)]">Collections by method (PKR)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--cls-ink)]">{money(methodTotal)}</p>
          <p
            className="mt-1.5 truncate text-xs text-[var(--cls-muted)]"
            title={methods.map(([label, value]) => `${methodOf(label)}: ${money(value)}`).join(", ")}
          >
            {methods.map(([label, value]) => `${methodOf(label)}: ${money(value)}`).join(" · ")}
          </p>
        </div>
      ) : null}
    </div>
  )
}
