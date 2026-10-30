import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts"

import type { AbsentTeacher, AlertsWidget, AttendanceWidget, FeeStatusWidget, PendingWidget } from "@/api/dashboard/dashboard.service"
import { StatusBadge } from "@/components/app/kit"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

import { dayLabel, PENDING_LABELS, type PendingKey, percentText } from "./dashboard-format"
import { WidgetCard, WidgetEmpty } from "./widget-card"

const donutConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  absent: { label: "Absent", color: "var(--chart-4)" },
  leave: { label: "Leave", color: "var(--chart-3)" },
} satisfies ChartConfig
const trendConfig = { percent: { label: "Attendance %", color: "var(--chart-1)" } } satisfies ChartConfig

export function AttendanceToday({ attendance }: { attendance: AttendanceWidget }) {
  const { today } = attendance
  const slices = [
    { key: "present", value: today.present, fill: "var(--color-present)" },
    { key: "absent", value: today.absent, fill: "var(--color-absent)" },
    { key: "leave", value: today.leave, fill: "var(--color-leave)" },
  ]
  return (
    <WidgetCard title="Attendance today" description={`${today.marked} students marked`} testId="dash-attendance">
      {!today.marked && <WidgetEmpty>No attendance marked yet today.</WidgetEmpty>}
      {today.marked > 0 && (
        <div className="flex items-center gap-4">
          <ChartContainer config={donutConfig} className="aspect-square h-36 shrink-0">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie data={slices} dataKey="value" nameKey="key" innerRadius={42} outerRadius={64} strokeWidth={2}>
                {slices.map((slice) => (
                  <Cell key={slice.key} fill={slice.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <dl className="grid gap-1 text-sm">
            <dt className="font-heading text-3xl font-semibold" data-testid="dash-attendance-percent">{percentText(today.percent)}</dt>
            <dd className="text-muted-foreground">Present {today.present} · Absent {today.absent} · Leave {today.leave}</dd>
          </dl>
        </div>
      )}
    </WidgetCard>
  )
}

export function AttendanceTrend({ attendance }: { attendance: AttendanceWidget }) {
  const data = attendance.trend.map((point) => ({ label: dayLabel(point.date), percent: point.percent ?? 0 }))
  return (
    <WidgetCard title="Attendance, last 7 days" testId="dash-attendance-trend">
      {!data.length && <WidgetEmpty>No attendance in the last 7 days.</WidgetEmpty>}
      {data.length > 0 && (
        <ChartContainer config={trendConfig} className="aspect-auto h-44 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
            <Bar dataKey="percent" fill="var(--color-percent)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </WidgetCard>
  )
}

function coverage(row: AbsentTeacher) {
  if (row.uncovered > 0) return `${row.uncovered} uncovered`
  return "Covered"
}

export function AbsentTeachers({ rows, onOpen }: { rows: AbsentTeacher[]; onOpen: (section: string) => void }) {
  const gaps = rows.reduce((sum, row) => sum + row.uncovered, 0)
  return (
    <WidgetCard
      title="Absent teachers today"
      description={`${gaps} timetable periods without a substitute`}
      testId="dash-absent-teachers"
      action={<button type="button" className="text-sm font-medium text-primary" onClick={() => onOpen("substitutes")}>Substitutes</button>}
    >
      {!rows.length && <WidgetEmpty>Every teacher is in today.</WidgetEmpty>}
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.teacherId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{row.name}</span>
              <span className="text-xs text-muted-foreground">{row.periods} periods · {row.covered} covered</span>
            </span>
            <StatusBadge value={coverage(row)} />
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

export function PendingApprovals({ pending, onOpen }: { pending: PendingWidget; onOpen: (section: string) => void }) {
  const keys = Object.keys(PENDING_LABELS).filter((key): key is PendingKey => key in pending)
  return (
    <WidgetCard title="Pending approvals" testId="dash-pending">
      {!keys.length && <WidgetEmpty>Nothing waits on you.</WidgetEmpty>}
      <ul className="divide-y">
        {keys.map((key) => (
          <li key={key}>
            <button type="button" className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:text-primary" onClick={() => onOpen(PENDING_LABELS[key].section)}>
              <span>{PENDING_LABELS[key].label}</span>
              <span className="min-w-8 rounded-full bg-muted px-2 py-0.5 text-center font-medium" data-testid={`pending-${key}`}>{pending[key]}</span>
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}

export function FeeStatus({ status }: { status: FeeStatusWidget }) {
  return (
    <WidgetCard title="Fee status" description={`Students with nothing owed up to ${status.label}`} testId="dash-fee-status">
      <dl className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Cleared</dt>
          <dd className="font-heading text-2xl font-semibold">{status.cleared}</dd>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Not cleared</dt>
          <dd className="font-heading text-2xl font-semibold">{status.notCleared}</dd>
        </div>
      </dl>
    </WidgetCard>
  )
}

type AlertItem = { key: string; text: string; section: string }

function alertItems(alerts: AlertsWidget): AlertItem[] {
  const items: AlertItem[] = alerts.classesWithoutFeeStructure.map((row) => ({
    key: `class-${row.classId}`,
    text: `${row.label} has no fee structure`,
    section: "fees",
  }))
  if (alerts.failedImports > 0) {
    items.push({ key: "imports", text: `${alerts.failedImports} offline import batches failed`, section: "offline-sync" })
  }
  return items
}

export function Alerts({ alerts, onOpen }: { alerts: AlertsWidget; onOpen: (section: string) => void }) {
  const items = alertItems(alerts)
  return (
    <WidgetCard title="Alerts" testId="dash-alerts">
      {!items.length && <WidgetEmpty>No alerts. All set up.</WidgetEmpty>}
      <ul className="divide-y">
        {items.map((item) => (
          <li key={item.key}>
            <button type="button" className="w-full py-2.5 text-left text-sm text-amber-800 hover:underline" onClick={() => onOpen(item.section)}>{item.text}</button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  )
}
