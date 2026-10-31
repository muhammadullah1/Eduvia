import { useQuery } from "@tanstack/react-query"
import { CalendarCheck, GraduationCap, Users, WalletCards } from "lucide-react"

import dashboardService, { type Dashboard, type DashboardWidgets } from "@/api/dashboard/dashboard.service"
import { EmptyState, MetricCard } from "@/components/app/kit"
import { ReportPanelMessage } from "@/components/app/report-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { errorText, pkrAmount } from "@/features/finance/format"
import { useCan } from "@/lib/access"
import { useUrlTab } from "@/lib/use-url-tab"

import { AbsentTeachers, Alerts, AttendanceToday, AttendanceTrend, FeeStatus, PendingApprovals } from "./academic-widgets"
import { GenerationStatus, MyImports, MyReceiptsToday } from "./accountant-widgets"
import { percentText } from "./dashboard-format"
import { CollectionByMethod, CollectionTrend, DefaulterClasses, IncomeVsExpenses, RecentPayments } from "./finance-widgets"
import { OwnerDashboard } from "./owner-dashboard"

const SKELETON_CARDS = 4
/** Server-side presets (GET /dashboard?period=…); the API resolves each to dates. */
const PERIODS = [
  { value: "session", label: "Session" },
  { value: "month", label: "Monthly" },
  { value: "week", label: "Weekly" },
  { value: "day", label: "Daily" },
] as const
const DEFAULT_PERIOD = "month"
/** useUrlTab falls back to the first key, so the default leads. */
const PERIOD_KEYS = [DEFAULT_PERIOD, ...PERIODS.map((p) => p.value).filter((value) => value !== DEFAULT_PERIOD)]

type Kpi = { key: string; label: string; value: string; note: string; icon: typeof Users }

function kpis(w: DashboardWidgets, periodLabel: string): Kpi[] {
  const out: Kpi[] = []
  if (w.students) out.push({ key: "students", label: "Active students", value: String(w.students.active), note: "Enrolled now", icon: GraduationCap })
  if (w.teachers) out.push({ key: "teachers", label: "Teachers", value: String(w.teachers.active), note: "Active staff", icon: Users })
  if (w.attendance) {
    out.push({ key: "attendance", label: "Attendance today", value: percentText(w.attendance.today.percent), note: `${w.attendance.today.marked} marked`, icon: CalendarCheck })
  }
  if (w.finance) {
    out.push({ key: "collected", label: "Fee collected", value: pkrAmount(w.finance.collected), note: `${periodLabel} · expected ${pkrAmount(w.finance.expected)} (${w.finance.collectionRate}%)`, icon: WalletCards })
    out.push({ key: "outstanding", label: "Outstanding dues", value: pkrAmount(w.finance.outstanding), note: "All months up to now", icon: WalletCards })
  }
  return out
}

function LoadingState() {
  return (
    <div className="grid gap-4" data-testid="dash-loading" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function Widgets({ data, onOpen }: { data: Dashboard; onOpen: (section: string) => void }) {
  const w = data.widgets
  const cards = kpis(w, data.period.label)
  if (!Object.keys(w).length) {
    return <EmptyState title="Nothing to show yet" detail="Your role has no dashboard widgets. Ask a Super Admin to review your permissions." />
  }
  if (w.finance) return <OwnerDashboard data={data} onOpen={onOpen} />
  return (
    <div className="grid gap-4">
      {cards.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4" data-testid="dash-kpis">
          {cards.map((card) => (
            <MetricCard key={card.key} icon={card.icon} label={card.label} value={card.value} note={card.note} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {w.myReceiptsToday && <MyReceiptsToday rows={w.myReceiptsToday.rows} onOpen={onOpen} />}
        {w.generation && <GenerationStatus status={w.generation} onOpen={onOpen} />}
        {w.myImports && <MyImports rows={w.myImports} onOpen={onOpen} />}
        {w.finance && <CollectionTrend finance={w.finance} periodLabel={data.period.label} />}
        {w.finance && <CollectionByMethod finance={w.finance} />}
        {w.attendance && <AttendanceToday attendance={w.attendance} />}
        {w.attendance && <AttendanceTrend attendance={w.attendance} />}
        {w.feeStatus && <FeeStatus status={w.feeStatus} />}
        {w.absentTeachers && <AbsentTeachers rows={w.absentTeachers} onOpen={onOpen} />}
        {w.pending && <PendingApprovals pending={w.pending} onOpen={onOpen} />}
        {w.finance && <DefaulterClasses finance={w.finance} onOpen={onOpen} />}
        {w.incomeVsExpenses && <IncomeVsExpenses data={w.incomeVsExpenses} periodLabel={data.period.label} />}
        {w.alerts && <Alerts alerts={w.alerts} onOpen={onOpen} />}
        {w.finance && <RecentPayments finance={w.finance} onOpen={onOpen} />}
      </div>
    </div>
  )
}

/**
 * Staff dashboard (EDUVIA-16 Phase 2): one server-built, permission-shaped payload.
 * The period lives in `?period=` and uses the Finance report keys and labels.
 */
export function DashboardPage({ onOpen }: { onOpen: (section: string) => void }) {
  const can = useCan()
  const [period, setPeriod] = useUrlTab(PERIOD_KEYS, "period")
  const query = useQuery({ queryKey: ["dashboard", period], queryFn: () => dashboardService.get(period) })

  return (
    <section className="flex min-w-0 flex-col gap-5" data-testid="staff-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{query.data?.period.label ?? "Today at your school"}</p>
        </div>
        {can("fees.totals") && (
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            aria-label="Period"
            value={period}
            onValueChange={(value) => value && setPeriod(value)}
            className="w-full bg-white sm:w-auto"
          >
            {PERIODS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="flex-1 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:flex-none">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      {query.isPending && <LoadingState />}
      {query.isError && (
        <div className="rounded-xl border bg-white">
          <ReportPanelMessage
            title="Dashboard unavailable"
            detail={errorText(query.error, "Could not load the dashboard.")}
            action={<Button variant="outline" size="sm" onClick={() => void query.refetch()}>Try again</Button>}
          />
        </div>
      )}
      {query.data && <Widgets data={query.data} onOpen={onOpen} />}
    </section>
  )
}
