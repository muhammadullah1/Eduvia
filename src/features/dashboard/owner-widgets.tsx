import { ArrowDownRight, ArrowUpRight, BellRing, CalendarCheck, CheckCircle2, Users, WalletCards } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import type { AbsentTeacher, AlertsWidget, AttendanceWidget, FinanceWidget, PendingWidget } from "@/api/dashboard/dashboard.service"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { pkrAmount } from "@/features/finance/format"
import { cn } from "@/lib/utils"

import { alertItems, dayLabel, PENDING_LABELS, type PendingKey, plural, share } from "./dashboard-format"
import { type Delta, type Kpi, pendingTotal } from "./owner-kpis"
import { WidgetBadge, WidgetCard, WidgetEmpty, WidgetLink } from "./widget-card"

type Open = (section: string) => void

const collectionConfig = { amount: { label: "Collected", color: "var(--chart-1)" } } satisfies ChartConfig
const absenceConfig = { absent: { label: "Absent", color: "var(--chart-4)" } } satisfies ChartConfig

function TrendLine({ delta, note }: { delta?: Delta; note: string }) {
  if (!delta || delta.value === null) return <p className="truncate text-xs text-muted-foreground">{note}</p>
  const up = delta.value >= 0
  const good = up === delta.goodWhenUp
  return (
    <p className={cn("flex items-center gap-1 truncate text-xs", good && "text-[var(--success)]", !good && "text-destructive")}>
      {up && <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />}
      {!up && <ArrowDownRight className="size-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{Math.abs(delta.value)}% {delta.against}</span>
    </p>
  )
}

/** Compact KPI tile after the ASAMAN strip: label + icon chip, value, trend. */
export function KpiTile({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3" data-testid={`kpi-${kpi.key}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-[var(--cls-ink)]">{kpi.label}</p>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--cls-border)] text-primary">
          <Icon className="size-3.5" aria-hidden />
        </span>
      </div>
      <p className="font-heading text-xl font-bold tracking-wide text-[var(--cls-ink)] tabular-nums">{kpi.value}</p>
      <TrendLine delta={kpi.delta} note={kpi.note} />
    </div>
  )
}

export function CollectionOverview({ finance, periodLabel, onOpen }: { finance: FinanceWidget; periodLabel: string; onOpen: Open }) {
  const hasTrend = finance.trend.some((point) => point.amount > 0)
  const rate = share(finance.paidAgainstBills, finance.expected)
  return (
    <WidgetCard
      title="Fee collection"
      description={`Collected against bills · ${periodLabel}`}
      badge={<WidgetBadge>{finance.collectionRate}% collected</WidgetBadge>}
      action={<WidgetLink label="Open fee management" onClick={() => onOpen("fees")} />}
      testId="dash-collection"
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Collected" value={pkrAmount(finance.collected)} />
        <Stat label="Expected" value={pkrAmount(finance.expected)} />
        <Stat label="Outstanding" value={pkrAmount(finance.outstanding)} tone="red" />
        <Stat label="Advance credit" value={pkrAmount(finance.advanceCredit.amount)} hint={`${finance.advanceCredit.students} students`} />
      </dl>
      <Progress value={rate} className="mt-4 h-2" aria-label="Bills paid" />
      <div className="mt-5">
        {!hasTrend && <WidgetEmpty icon={WalletCards} hint="Receipts appear here month by month once fees are collected.">No fee receipts in this period yet.</WidgetEmpty>}
        {hasTrend && (
          <ChartContainer config={collectionConfig} className="aspect-auto h-52 w-full">
            <AreaChart data={finance.trend} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="dash-collection-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => pkrAmount(Number(value))} />} />
              <Area dataKey="amount" type="monotone" fill="url(#dash-collection-fill)" stroke="var(--color-amount)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </WidgetCard>
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "red" }) {
  return (
    <div className="min-w-0 rounded-lg bg-[var(--page-wash)] px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-sm font-semibold tabular-nums text-[var(--cls-ink)]", tone === "red" && "text-destructive")}>{value}</dd>
      {hint && <dd className="text-[11px] text-muted-foreground">{hint}</dd>}
    </div>
  )
}

export function StudentAbsence({ attendance, onOpen }: { attendance: AttendanceWidget; onOpen: Open }) {
  const { today } = attendance
  const data = attendance.trend.map((point) => ({ label: dayLabel(point.date), absent: point.absent }))
  return (
    <WidgetCard
      title="Student absence"
      description="Today and the last 7 days"
      badge={today.absent > 0 && <WidgetBadge tone="red">{today.absent} absent</WidgetBadge>}
      action={<WidgetLink label="Open attendance" onClick={() => onOpen("attendance")} />}
      testId="dash-student-absence"
    >
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Present" value={String(today.present)} />
        <Stat label="Absent" value={String(today.absent)} tone="red" />
        <Stat label="On leave" value={String(today.leave)} />
      </dl>
      <div className="mt-4">
        {!data.length && <WidgetEmpty icon={CalendarCheck} hint="Absences show here once teachers mark attendance.">No attendance marked this week.</WidgetEmpty>}
        {data.length > 0 && (
          <ChartContainer config={absenceConfig} className="aspect-auto h-40 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="absent" fill="var(--color-absent)" radius={4} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </WidgetCard>
  )
}

export function TopDefaulters({ finance, onOpen }: { finance: FinanceWidget; onOpen: Open }) {
  return (
    <WidgetCard
      title="Top defaulters"
      description="Largest dues up to this month"
      action={<WidgetLink label="Open collect fee" onClick={() => onOpen("collect-fee")} />}
      testId="dash-defaulters"
    >
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          {!finance.defaulterStudents.length && <WidgetEmpty icon={CheckCircle2}>No student owes anything.</WidgetEmpty>}
          <ul className="divide-y">
            {finance.defaulterStudents.map((row) => (
              <li key={row.studentId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{row.classLabel ?? "No class"} · {row.months} {plural(row.months, "month")} due</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-destructive">{pkrAmount(row.amount)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="classes">
          {!finance.defaulterClasses.length && <WidgetEmpty icon={CheckCircle2}>No class has outstanding dues.</WidgetEmpty>}
          <ul className="divide-y">
            {finance.defaulterClasses.map((row) => (
              <li key={row.classId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.label}</span>
                  <span className="text-xs text-muted-foreground">{row.students} students owing</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{pkrAmount(row.amount)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </WidgetCard>
  )
}

export function TeacherCoverage({ rows, onOpen }: { rows: AbsentTeacher[]; onOpen: Open }) {
  const periods = rows.reduce((sum, row) => sum + row.periods, 0)
  const covered = rows.reduce((sum, row) => sum + row.covered, 0)
  return (
    <WidgetCard
      title="Teacher absences"
      description="Substitute coverage today"
      badge={rows.length > 0 && <WidgetBadge tone="amber">{rows.length} absent</WidgetBadge>}
      action={<WidgetLink label="Open substitutes" onClick={() => onOpen("substitutes")} />}
      testId="dash-absent-teachers"
    >
      {!rows.length && <WidgetEmpty icon={Users} hint="Absences reported for today appear here with their cover.">Every teacher is in today.</WidgetEmpty>}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{covered} of {periods} periods covered</span>
            <span className="font-medium text-[var(--cls-ink)]">{share(covered, periods)}%</span>
          </div>
          <Progress value={share(covered, periods)} className="mt-1.5 h-2" aria-label="Periods covered" />
          <ul className="mt-2 divide-y">
            {rows.map((row) => (
              <li key={row.teacherId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{row.periods} periods · {row.covered} covered</span>
                </span>
                {row.uncovered > 0 && <WidgetBadge tone="red">{row.uncovered} uncovered</WidgetBadge>}
                {row.uncovered === 0 && <WidgetBadge>Covered</WidgetBadge>}
              </li>
            ))}
          </ul>
        </>
      )}
    </WidgetCard>
  )
}

/** Only queues with work in them; an all-clear state when there are none. */
export function OwnerApprovals({ pending, onOpen }: { pending: PendingWidget; onOpen: Open }) {
  const keys = Object.keys(PENDING_LABELS).filter((key): key is PendingKey => key in pending).filter((key) => (pending[key] ?? 0) > 0)
  return (
    <WidgetCard title="Pending approvals" badge={keys.length > 0 && <WidgetBadge>{pendingTotal(pending)} waiting</WidgetBadge>} testId="dash-pending">
      {!keys.length && <WidgetEmpty icon={CheckCircle2} hint="New requests for your approval will appear here.">All caught up.</WidgetEmpty>}
      <ul className="flex flex-col gap-2">
        {keys.map((key) => (
          <li key={key}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--cls-border)] px-3 py-2.5 text-left text-sm hover:border-primary/40 hover:bg-[var(--secondary-color)]"
              onClick={() => onOpen(PENDING_LABELS[key].section)}
            >
              <span>{PENDING_LABELS[key].label}</span>
              <span className="min-w-7 rounded-full bg-primary px-2 py-0.5 text-center text-xs font-semibold text-primary-foreground" data-testid={`pending-${key}`}>{pending[key]}</span>
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

export function OwnerAlerts({ alerts, onOpen }: { alerts: AlertsWidget; onOpen: Open }) {
  const items = alertItems(alerts)
  return (
    <WidgetCard title="Alerts" badge={items.length > 0 && <WidgetBadge tone="red">{items.length}</WidgetBadge>} testId="dash-alerts">
      {!items.length && <WidgetEmpty icon={BellRing} hint="Setup gaps and failures show here.">No alerts. All set up.</WidgetEmpty>}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.key}>
            <button type="button" className="flex w-full items-start gap-2.5 text-left" onClick={() => onOpen(item.section)}>
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--warning)]" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--cls-ink)] hover:underline">{item.text}</span>
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}
