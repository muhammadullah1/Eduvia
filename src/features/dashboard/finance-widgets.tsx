import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import type { FinanceWidget, IncomeVsExpensesWidget } from "@/api/dashboard/dashboard.service"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { pkrAmount } from "@/features/finance/format"
import { cn } from "@/lib/utils"

import { methodLabel, share } from "./dashboard-format"
import { WidgetCard, WidgetEmpty } from "./widget-card"

const trendConfig = { amount: { label: "Collected", color: "var(--chart-1)" } } satisfies ChartConfig

export function CollectionTrend({ finance, periodLabel }: { finance: FinanceWidget; periodLabel: string }) {
  const hasData = finance.trend.some((point) => point.amount > 0)
  return (
    <WidgetCard title="Fee collection trend" description={`Receipts per month · ${periodLabel}`} className="lg:col-span-2" testId="dash-trend">
      {!hasData && <WidgetEmpty>No fee receipts in this period yet.</WidgetEmpty>}
      {hasData && (
        <ChartContainer config={trendConfig} className="aspect-auto h-56 w-full">
          <AreaChart data={finance.trend} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => pkrAmount(Number(value))} />} />
            <Area dataKey="amount" type="monotone" fill="var(--color-amount)" fillOpacity={0.15} stroke="var(--color-amount)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      )}
    </WidgetCard>
  )
}

export function CollectionByMethod({ finance }: { finance: FinanceWidget }) {
  const total = finance.byMethod.reduce((sum, row) => sum + row.amount, 0)
  return (
    <WidgetCard title="Collection by method" description="Share of fee receipts in the period" testId="dash-methods">
      {!finance.byMethod.length && <WidgetEmpty>No receipts in this period.</WidgetEmpty>}
      <ul className="flex flex-col gap-4">
        {finance.byMethod.map((row) => (
          <li key={row.method} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{methodLabel(row.method)}</span>
              <span className="text-muted-foreground">{pkrAmount(row.amount)}</span>
            </div>
            <Progress value={share(row.amount, total)} aria-label={`${methodLabel(row.method)} share`} />
            <span className="text-xs text-muted-foreground">{row.receipts} receipts</span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

export function DefaulterClasses({ finance, onOpen }: { finance: FinanceWidget; onOpen: (section: string) => void }) {
  return (
    <WidgetCard title="Top defaulter classes" description="Outstanding dues up to this month" testId="dash-defaulters">
      {!finance.defaulterClasses.length && <WidgetEmpty>No class has outstanding dues.</WidgetEmpty>}
      <ul className="divide-y">
        {finance.defaulterClasses.map((row) => (
          <li key={row.classId}>
            <button type="button" className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:text-primary" onClick={() => onOpen("fees")}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{row.label}</span>
                <span className="text-xs text-muted-foreground">{row.students} students owing</span>
              </span>
              <span className="shrink-0 font-medium">{pkrAmount(row.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

export function IncomeVsExpenses({ data, periodLabel }: { data: IncomeVsExpensesWidget; periodLabel: string }) {
  const rows = [
    { key: "income", label: "Income", value: data.income },
    { key: "expenses", label: "Expenses", value: data.expenses },
  ]
  const largest = Math.max(data.income, data.expenses)
  return (
    <WidgetCard title="Income vs expenses" description={periodLabel} testId="dash-income-expenses">
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span>{pkrAmount(row.value)}</span>
            </div>
            <Progress value={share(row.value, largest)} aria-label={`${row.label} bar`} />
          </li>
        ))}
      </ul>
      <p className={cn("mt-4 text-sm font-semibold", data.net < 0 && "text-destructive")} data-testid="dash-net">
        Net {pkrAmount(data.net)}
      </p>
    </WidgetCard>
  )
}

export function RecentPayments({ finance, onOpen }: { finance: FinanceWidget; onOpen: (section: string) => void }) {
  return (
    <WidgetCard
      title="Recent payments"
      className="lg:col-span-2"
      testId="dash-recent"
      action={<button type="button" className="text-sm font-medium text-primary" onClick={() => onOpen("fees")}>View all</button>}
    >
      {!finance.recentPayments.length && <WidgetEmpty>No payments recorded yet.</WidgetEmpty>}
      {finance.recentPayments.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="hidden sm:table-cell">Receipt</TableHead>
              <TableHead className="hidden sm:table-cell">Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finance.recentPayments.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-40 whitespace-normal">
                  <span className="block font-medium">{row.studentName}</span>
                  <span className="text-xs text-muted-foreground">{row.classLabel} · {row.date}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{row.receiptNo}</TableCell>
                <TableCell className="hidden sm:table-cell">{methodLabel(row.method)}</TableCell>
                <TableCell className="text-right font-medium">{pkrAmount(row.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </WidgetCard>
  )
}
