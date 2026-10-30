import { useQuery } from "@tanstack/react-query"
import { FileBarChart2, History } from "lucide-react"
import { useMemo, useState } from "react"

import auditService from "@/api/audit/audit.service"
import { FEE_REPORT_KINDS } from "@/api/fees/fee-reports.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { EmptyState } from "@/components/app/kit"
import {
  ReportPageHeader,
  ReportPanel,
  ReportPanelMessage,
} from "@/components/app/report-layout"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FeeReportsPanel } from "@/features/management/fee-reports"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useCan } from "@/lib/access"
import { useActor } from "@/lib/actor"
import { timeAgo } from "@/lib/format"
import { useUrlTab } from "@/lib/use-url-tab"

/** Entity types supported by GET /audit-logs (API max limit 200). */
const AUDIT_ENTITY_FILTERS = [
  { value: "all", label: "All entities" },
  { value: "school_setting", label: "Settings" },
  { value: "school_update", label: "Notices" },
  { value: "fee_payment", label: "Fee payments" },
  { value: "student_fee_month", label: "Fee months" },
  { value: "exam", label: "Exams" },
  { value: "daily_lesson", label: "Daily lessons" },
] as const

const ALL_KINDS = FEE_REPORT_KINDS.map((k) => k.kind)

/**
 * Reports (SRS §4.5, §9). Fee reports come from the API and are Super Admin + Accountant only;
 * the Operations Manager never sees fee data. The audit trail is Super Admin + Operations Manager (read-only for Ops).
 * Overall Financial Reports live under Finance (/admin/finance?tab=report).
 */
export function Reports() {
  const actor = useActor()
  const can = useCan()
  const fees = can("fees.reports")
  const audit = can("audit.read")

  const tabs = useMemo(
    () => [
      ...(fees ? [{ value: "fees", label: "Fee reports", icon: FileBarChart2 }] : []),
      ...(audit ? [{ value: "audit", label: "Audit trail", icon: History }] : []),
    ],
    [fees, audit]
  )
  const allowed = useMemo(() => (tabs.length ? tabs.map((t) => t.value) : ["none"]), [tabs])
  const [view, setView] = useUrlTab(allowed, "tab")

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ReportPageHeader title="Reports" subtitle="School reports for your role" />
        <EmptyState
          title="No reports for your role"
          detail="Fee reports are available to the Super Admin and Accountant only. Attendance registers can be printed from Student attendance."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportPageHeader
        title="Reports"
        subtitle={
          fees
            ? "Fee collections, balances, and traceable security audit history"
            : "Security audit trail"
        }
      />
      {tabs.length > 1 ? (
        <ClsSubTabs aria-label="Reports" value={view} onValueChange={setView} items={tabs} />
      ) : null}
      {view === "fees" && fees ? (
        <FeeReportsPanel kinds={actor.role === "super_admin" ? ALL_KINDS : ["daily"]} />
      ) : null}
      {view === "audit" && audit ? <AuditTrail /> : null}
    </div>
  )
}

/** Read-only audit log page (Operations Manager); the API hides fee entries from Ops. */
export function AuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <ReportPageHeader title="Audit log" subtitle="Read-only record of sensitive actions" />
      <AuditTrail />
    </div>
  )
}

function AuditTrail() {
  const [entityType, setEntityType] = useState("all")
  const auditsQuery = useQuery({
    queryKey: ["audit-logs", entityType],
    queryFn: () =>
      auditService.list({
        limit: 200,
        entityType: entityType === "all" ? undefined : entityType,
      }),
  })
  const audits = auditsQuery.data ?? []
  const { paginatedItems, pagination } = useClientPagination(audits)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--cls-ink)]">Security audit trail</h2>
          <p className="mt-0.5 text-sm text-[var(--cls-muted)]">
            Sensitive actions recorded by the school system. Showing up to 200
            newest matching events (API limit).
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger aria-label="Filter audit entities">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_ENTITY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ReportPanel pagination={pagination}>
        {auditsQuery.isLoading ? (
          <ReportPanelMessage title="Loading audit trail…" />
        ) : auditsQuery.isError ? (
          <ReportPanelMessage title="Could not load audit trail" />
        ) : audits.length === 0 ? (
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
