import { useQuery } from "@tanstack/react-query"
import { CalendarCheck, GraduationCap, Users, WalletCards } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import dashboardService, { type Dashboard, type DashboardWidgets } from "@/api/dashboard/dashboard.service"
import { EmptyState, MetricCard } from "@/components/app/kit"
import { ReportPanelMessage } from "@/components/app/report-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { errorText, pkrAmount } from "@/features/finance/format"
import { PeriodSelect } from "@/features/finance/period-select"
import { periodOptions } from "@/features/finance/periods"
import { useCan } from "@/lib/access"
import { portalPath } from "@/lib/auth"
import { getToday } from "@/lib/dates"
import type { PermissionKey } from "@/lib/permission-keys.generated"
import { useUrlTab } from "@/lib/use-url-tab"
import { useAuthStore } from "@/stores/auth-store"

import { AbsentTeachers, Alerts, AttendanceToday, AttendanceTrend, FeeStatus, PendingApprovals } from "./academic-widgets"
import { GenerationStatus, MyImports, MyReceiptsToday } from "./accountant-widgets"
import { percentText } from "./dashboard-format"
import { CollectionByMethod, CollectionTrend, DefaulterClasses, IncomeVsExpenses, RecentPayments } from "./finance-widgets"

const SKELETON_CARDS = 4
const QUICK_ACTIONS: { label: string; section: string; search?: string; requires: PermissionKey }[] = [
  { label: "Collect fee", section: "collect-fee", requires: "fees.payments.record" },
  { label: "Generate month", section: "fees", requires: "fees.totals" },
  { label: "Generate month", section: "fee-generation", requires: "fees.months.generate" },
  { label: "Add student", section: "admissions", requires: "admissions.manage" },
  { label: "Record expense", section: "finance", search: "?tab=expenses", requires: "expenses.create" },
]

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

function QuickActions() {
  const can = useCan()
  const role = useAuthStore((s) => s.role)
  const seen = new Set<string>()
  const actions = QUICK_ACTIONS.filter((action) => {
    if (!can(action.requires) || seen.has(action.label)) return false
    seen.add(action.label)
    return true
  })
  if (!actions.length) return null
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {actions.map((action) => (
        <Button key={action.section} asChild>
          <Link to={`${portalPath(role, action.section)}${action.search ?? ""}`}>{action.label}</Link>
        </Button>
      ))}
    </nav>
  )
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
  const periodKeys = useMemo(() => {
    const options = periodOptions(getToday())
    return [...options.months, ...options.quarters, ...options.years].map((o) => o.value)
  }, [])
  const [period, setPeriod] = useUrlTab(periodKeys, "period")
  const query = useQuery({ queryKey: ["dashboard", period], queryFn: () => dashboardService.get(period) })

  return (
    <section className="flex min-w-0 flex-col gap-5" data-testid="staff-dashboard">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{query.data?.period.label ?? "Today at your school"}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {can("fees.totals") && <PeriodSelect value={period} onChange={setPeriod} className="w-full bg-white sm:w-72" />}
          <QuickActions />
        </div>
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
