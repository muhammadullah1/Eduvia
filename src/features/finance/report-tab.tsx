import { useQuery } from "@tanstack/react-query"
import { Printer, TrendingDown, TrendingUp } from "lucide-react"
import { useMemo } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

import financeService, { type BreakdownItem, type FinanceReport } from "@/api/finance/finance.service"
import { Field } from "@/components/app/kit"
import { ExportButtons, ReportPanelMessage } from "@/components/app/report-layout"
import { Button } from "@/components/ui/button"
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useReportDownload } from "@/hooks/use-report-download"
import { getToday } from "@/lib/dates"
import { printDocument } from "@/lib/print"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { amount, CATEGORY_COLOR, errorText, pkrAmount, signedPkr } from "./format"
import { periodOptions } from "./periods"

const barConfig = {
  income: { label: "Income", color: "#1f5e3b" },
  expenses: { label: "Expenses", color: "#e57373" },
} satisfies ChartConfig
const lineConfig = { net: { label: "Net balance", color: "#1f5e3b" } } satisfies ChartConfig

const compact = (v: number) => (Math.abs(v) >= 1_000_000 ? `${Math.round(v / 100_000) / 10}M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))
const panel = "min-w-0 rounded-xl border border-[var(--cls-border)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)] sm:p-5"

function printReport(r: FinanceReport) {
  const lines = [
    `Period: ${r.period.label}`,
    `Total income: ${pkrAmount(r.totals.income)} (fee ${pkrAmount(r.totals.feeIncome)}, other ${pkrAmount(r.totals.otherIncome)})`,
    `Total expenses: ${pkrAmount(r.totals.expenses)} (staff ${pkrAmount(r.totals.staffExpenses)})`,
    `Net: ${signedPkr(r.totals.net)} — ${r.totals.position}`,
    `Fee receipts: ${r.reconciliation.feeReceipts}`,
    ...r.breakdown.income.map((b) => `Income · ${b.label}: ${pkrAmount(b.amount)} (${b.percent}%)`),
    ...r.breakdown.expenses.map((b) => `Expense · ${b.label}: ${pkrAmount(b.amount)} (${b.percent}%)`),
  ]
  const ok = printDocument(`Financial Report — ${r.period.label}`, lines, {
    columns: ["Month", "Fee income", "Other income", "Total income", "Expenses", "Net"],
    rows: r.series.map((s) => [s.label, amount(s.feeIncome), amount(s.otherIncome), amount(s.income), amount(s.expenses), amount(s.net)]),
  })
  if (!ok) toast.error("Allow pop-ups to print the report.")
}

/**
 * Financial Report (Figma): period (month / FY quarter / FY), Income / Expenses /
 * Net cards, income vs expenses bars, the net trend, the two breakdowns, and
 * branded Excel / CSV / PDF exports plus Print. Super Admin only.
 */
export function ReportTab({ period, onPeriod }: { period: string; onPeriod: (value: string) => void }) {
  const options = useMemo(() => periodOptions(getToday()), [])
  const report = useQuery({ queryKey: ["finance", "report", period], queryFn: () => financeService.report(period) })
  const { busy, run } = useReportDownload()
  const r = report.data

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="finance-report">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Field label="Period">
          <Select value={period} onValueChange={onPeriod}>
            <SelectTrigger aria-label="Period" className="w-full border-[var(--cls-border)] bg-white sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectGroup>
                <SelectLabel>Month</SelectLabel>
                {options.months.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Quarter (financial year)</SelectLabel>
                {options.quarters.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Financial year (Apr – Mar)</SelectLabel>
                {options.years.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <ExportButtons busy={busy} disabled={!r} onExport={(format) => void run(format, () => financeService.downloadReport(period, format))} />
          <Button type="button" variant="outline" className="border-[var(--cls-border)] bg-white" disabled={!r} onClick={() => r && printReport(r)}>
            <Printer data-icon="inline-start" />
            Print
          </Button>
        </div>
      </div>

      {report.isLoading ? (
        <div className={panel}><ReportPanelMessage title="Loading report…" /></div>
      ) : report.isError || !r ? (
        <div className={panel}>
          <ReportPanelMessage
            title="Report unavailable"
            detail={errorText(report.error, "Could not load the financial report.")}
            action={<Button variant="outline" size="sm" onClick={() => void report.refetch()}>Try again</Button>}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card label="TOTAL INCOME" value={pkrAmount(r.totals.income)} sub={r.period.label} tone="income" testId="report-income" />
            <Card label="TOTAL EXPENSES" value={pkrAmount(r.totals.expenses)} sub={r.period.label} tone="expense" testId="report-expenses" />
            <Card
              label="NET FINANCIAL STATUS"
              value={signedPkr(r.totals.net)}
              sub={
                <span className={cn("inline-flex items-center gap-1 font-medium", r.totals.net < 0 ? "text-red-700" : "text-emerald-800")}>
                  {r.totals.net < 0 ? <TrendingDown className="size-3.5" aria-hidden /> : <TrendingUp className="size-3.5" aria-hidden />}
                  {r.totals.position}
                </span>
              }
              tone={r.totals.net < 0 ? "deficit" : "surplus"}
              testId="report-net"
            />
          </div>
          <p className="text-xs text-[var(--cls-muted)]" data-testid="report-reconciliation">
            Fee income {pkrAmount(r.totals.feeIncome)} from {r.reconciliation.feeReceipts} confirmed fee receipt{r.reconciliation.feeReceipts === 1 ? "" : "s"} (same figures as the fee collection reports) + other income {pkrAmount(r.totals.otherIncome)}.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={panel} aria-label="Income vs expenses">
              <h3 className="text-sm font-semibold text-[var(--cls-ink)]">Income vs Expenses — Monthly</h3>
              <ChartContainer config={barConfig} className="mt-3 h-[240px] w-full">
                <BarChart data={r.series} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickFormatter={(v: string) => v.split(" ")[0]} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </section>
            <section className={panel} aria-label="Net balance trend">
              <h3 className="text-sm font-semibold text-[var(--cls-ink)]">Net Balance Trend</h3>
              <ChartContainer config={lineConfig} className="mt-3 h-[240px] w-full">
                <AreaChart data={r.series} margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f5e3b" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#1f5e3b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickFormatter={(v: string) => v.split(" ")[0]} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} fill="url(#netFill)" dot={{ r: 3, fill: "var(--color-net)" }} />
                </AreaChart>
              </ChartContainer>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Income Breakdown" items={r.breakdown.income} empty="No income in this period." testId="income-breakdown" />
            <Breakdown title="Expense Breakdown" items={r.breakdown.expenses} empty="No expenses in this period." testId="expense-breakdown" />
          </div>
        </>
      )}
    </div>
  )
}

function Card({
  label,
  value,
  sub,
  tone,
  testId,
}: {
  label: string
  value: string
  sub: React.ReactNode
  tone: "income" | "expense" | "surplus" | "deficit"
  testId: string
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex min-w-0 min-h-[102px] flex-col justify-between rounded-xl border px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
        tone === "surplus" ? "border-emerald-200 bg-emerald-50" : tone === "deficit" ? "border-red-200 bg-red-50" : "border-[var(--cls-border)] bg-white"
      )}
    >
      <div>
        <p className="text-xs font-medium tracking-wide text-[var(--cls-muted)]">{label}</p>
        <p className={cn("mt-1 truncate text-2xl font-semibold tabular-nums", tone === "expense" || tone === "deficit" ? "text-red-700" : "text-emerald-800")}>{value}</p>
      </div>
      <div className="mt-1 text-xs text-[var(--cls-muted)]">{sub}</div>
    </div>
  )
}

function Breakdown({ title, items, empty, testId }: { title: string; items: BreakdownItem[]; empty: string; testId: string }) {
  const total = items.reduce((s, i) => s + i.amount, 0)
  const config = Object.fromEntries(items.map((i) => [i.key, { label: i.label, color: CATEGORY_COLOR[i.key] ?? "#6b7280" }])) as ChartConfig
  return (
    <section className={panel} aria-label={title} data-testid={testId}>
      <h3 className="text-sm font-semibold text-[var(--cls-ink)]">{title}</h3>
      {total <= 0 ? (
        <p className="py-10 text-center text-sm text-[var(--cls-muted)]">{empty}</p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
          <ChartContainer config={config} className="aspect-square h-[170px] shrink-0">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie data={items.filter((i) => i.amount > 0)} dataKey="amount" nameKey="key" innerRadius={50} outerRadius={80} strokeWidth={2}>
                {items.filter((i) => i.amount > 0).map((i) => (
                  <Cell key={i.key} fill={CATEGORY_COLOR[i.key] ?? "#6b7280"} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="w-full min-w-0 flex-1 space-y-2">
            {items.map((i) => (
              <li key={i.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[i.key] ?? "#6b7280" }} aria-hidden />
                  <span className="truncate text-[var(--cls-ink)]">{i.label}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                  <span className="text-xs text-[var(--cls-muted)]">{amount(i.amount)}</span>
                  <span className="w-12 text-right font-semibold">{i.percent}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
