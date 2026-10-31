import type { Dashboard } from "@/api/dashboard/dashboard.service"

import { AttendanceToday, FeeStatus } from "./academic-widgets"
import { CollectionByMethod, IncomeVsExpenses, RecentPayments } from "./finance-widgets"
import { ownerKpis } from "./owner-kpis"
import { CollectionOverview, KpiTile, OwnerAlerts, OwnerApprovals, StudentAbsence, TeacherCoverage, TopDefaulters } from "./owner-widgets"

/**
 * Owner (Super Admin) dashboard: a compact KPI strip, then money and absence in a
 * 2/3 column with the action queue (alerts, approvals, cover) in the 1/3 rail.
 * Bill generation is the accountant's job, so it is not shown here.
 */
export function OwnerDashboard({ data, onOpen }: { data: Dashboard; onOpen: (section: string) => void }) {
  const w = data.widgets
  const cards = ownerKpis(data)
  return (
    <div className="grid gap-4" data-testid="owner-dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="dash-kpis">
        {cards.map((card) => (
          <KpiTile key={card.key} kpi={card} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {w.finance && <CollectionOverview finance={w.finance} periodLabel={data.period.label} onOpen={onOpen} />}
          {w.incomeVsExpenses && <IncomeVsExpenses data={w.incomeVsExpenses} periodLabel={data.period.label} />}
          {w.attendance && <StudentAbsence attendance={w.attendance} onOpen={onOpen} />}
          {w.finance && <TopDefaulters finance={w.finance} onOpen={onOpen} />}
          {w.finance && <RecentPayments finance={w.finance} onOpen={onOpen} />}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {w.alerts && <OwnerAlerts alerts={w.alerts} onOpen={onOpen} />}
          {w.pending && <OwnerApprovals pending={w.pending} onOpen={onOpen} />}
          {w.absentTeachers && <TeacherCoverage rows={w.absentTeachers} onOpen={onOpen} />}
          {w.feeStatus && <FeeStatus status={w.feeStatus} />}
          {w.attendance && <AttendanceToday attendance={w.attendance} />}
          {w.finance && <CollectionByMethod finance={w.finance} />}
        </div>
      </div>
    </div>
  )
}
