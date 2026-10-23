import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import feeReportsService, {
  FEE_REPORT_KINDS,
  type FeeReportColumn,
  type FeeReportFilters,
  type FeeReportKind,
} from "@/api/fees/fee-reports.service"
import { Field } from "@/components/app/kit"
import {
  ExportButtons,
  reportCellClass,
  ReportHeadRow,
  ReportPanel,
  ReportPanelMessage,
} from "@/components/app/report-layout"
import { DatePicker } from "@/components/ui/date-picker"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useReportDownload } from "@/hooks/use-report-download"
import { getToday } from "@/lib/dates"
import { cn } from "@/lib/utils"

const isNumeric = (column: FeeReportColumn) => column.type === "money" || column.type === "number"

function cell(value: string | number | null | undefined, type?: string) {
  if (value === null || value === undefined || value === "") return "—"
  if (type === "money") return Number(value).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return String(value)
}

/**
 * Real fee reports from `/fees/reports/:kind` (Super Admin: all six with totals;
 * accountant: only their own daily receipts, never a total).
 */
export function FeeReportsPanel({ kinds }: { kinds: FeeReportKind[] }) {
  const { state } = useSchool()
  const today = getToday()
  const [kind, setKind] = useState<FeeReportKind>(kinds[0])
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [classId, setClassId] = useState("all")
  const { busy, run } = useReportDownload()
  const meta = FEE_REPORT_KINDS.find((k) => k.kind === kind) ?? FEE_REPORT_KINDS[0]
  const available = FEE_REPORT_KINDS.filter((k) => kinds.includes(k.kind))
  const filters: FeeReportFilters = useMemo(
    () => (meta.range === "days" ? { from, to, classId } : { month, classId }),
    [meta.range, from, to, month, classId]
  )
  const rangeError = meta.range === "days" && to < from ? "The end date must be on or after the start date." : undefined
  const report = useQuery({
    queryKey: ["fee-report", kind, filters],
    queryFn: () => feeReportsService.get(kind, filters),
    enabled: !rangeError,
  })
  const classes = useMemo(() => [...state.classes].sort((a, b) => a.label.localeCompare(b.label)), [state.classes])
  const data = report.data
  const rows = useMemo(() => data?.rows ?? [], [data])
  const { paginatedItems, pagination } = useClientPagination(rows)
  const ownOnly = kinds.length === 1 && kind === "daily"

  const toolbar = (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        {available.length > 1 ? (
          <Field label="Report">
            <Select value={kind} onValueChange={(value) => setKind(value as FeeReportKind)}>
              <SelectTrigger aria-label="Report" className="w-full border-[var(--cls-border)] bg-white lg:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((k) => (
                  <SelectItem key={k.kind} value={k.kind}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
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
      </div>
      <div className="flex flex-wrap gap-2">
        <ExportButtons
          busy={busy}
          disabled={Boolean(rangeError) || !data}
          onExport={(format) => void run(format, () => feeReportsService.download(kind, filters, format))}
        />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4" data-testid="fee-reports">
      <div>
        <h2 className="text-base font-semibold text-[var(--cls-ink)]">{data?.title ?? meta.label}</h2>
        <p className="mt-0.5 text-sm text-[var(--cls-muted)]">
          {ownOnly ? "Receipts you recorded. Totals are kept by the Super Admin." : meta.detail}
        </p>
      </div>

      {data?.summary?.length ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
          {data.summary.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
              <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--cls-ink)]">{String(value)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <ReportPanel toolbar={toolbar} pagination={data && rows.length ? pagination : undefined}>
        {report.isError ? (
          <ReportPanelMessage
            title="Report unavailable"
            detail={report.error instanceof Error ? report.error.message : "Could not load the report."}
          />
        ) : rangeError ? (
          <ReportPanelMessage title="Check the dates" detail={rangeError} />
        ) : report.isLoading ? (
          <ReportPanelMessage title="Loading report…" />
        ) : data && rows.length === 0 ? (
          <ReportPanelMessage title="Nothing to show" detail="No records match these filters." />
        ) : data ? (
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
                        {cell(row[c.key], c.type)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </ReportPanel>
    </div>
  )
}
