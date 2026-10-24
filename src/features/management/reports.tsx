import { useState } from "react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { EmptyState } from "@/components/app/kit"
import {
  ReportPageHeader,
  ReportPanel,
  ReportPanelMessage,
} from "@/components/app/report-layout"
import { Badge } from "@/components/ui/badge"
import { useSchool } from "@/data/store"
import { FeeReportsPanel } from "@/features/management/fee-reports"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useActor } from "@/lib/actor"
import { timeAgo } from "@/lib/format"
import { can } from "@/lib/permissions"

const ALL_KINDS = ["daily", "monthly", "class-wise", "student-wise", "outstanding", "advance"] as const

/**
 * Reports (SRS 4.5). Fee reports come from the API and are Super Admin + Accountant only;
 * the Operations Manager never sees fee data. The audit trail is Super Admin only.
 */
export function Reports() {
  const actor = useActor()
  const fees = can(actor.role, "fees.reports")
  const audit = can(actor.role, "audit.view")
  const tabs = [
    ...(fees ? [{ value: "fees", label: "Fee reports" }] : []),
    ...(audit ? [{ value: "audit", label: "Audit trail" }] : []),
  ]
  const [view, setView] = useState(tabs[0]?.value ?? "none")

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ReportPageHeader title="Reports" subtitle="School reports for your role" />
        <EmptyState
          title="No reports for your role"
          detail="Fee and finance reports are available to the Super Admin and Accountant only. Attendance registers can be printed from Student attendance."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportPageHeader
        title="Reports"
        subtitle={fees ? "Fee collections and balances, downloadable as branded Excel, CSV or PDF" : "Security audit trail"}
      />
      {tabs.length > 1 ? <ClsSubTabs aria-label="Reports" value={view} onValueChange={setView} items={tabs} /> : null}
      {view === "fees" && fees ? (
        <FeeReportsPanel kinds={actor.role === "super_admin" ? [...ALL_KINDS] : ["daily"]} />
      ) : null}
      {view === "audit" && audit ? <AuditTrail /> : null}
    </div>
  )
}

function AuditTrail() {
  const { state } = useSchool()
  const { paginatedItems, pagination } = useClientPagination(state.audits)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--cls-ink)]">Security audit trail</h2>
        <p className="mt-0.5 text-sm text-[var(--cls-muted)]">Sensitive actions recorded by the school system.</p>
      </div>
      <ReportPanel pagination={pagination}>
        {state.audits.length === 0 ? (
          <ReportPanelMessage title="No audit events yet" />
        ) : (
          <ul className="divide-y divide-[var(--cls-border)]">
            {paginatedItems.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--cls-ink)]">
                    <span className="font-semibold">{event.actor}</span> {event.action}
                  </p>
                  <p className="text-xs text-[var(--cls-muted)]">{timeAgo(event.at)}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {event.entity?.replace(/_/g, " ") ?? "recorded"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </ReportPanel>
    </div>
  )
}
