import { useQuery } from "@tanstack/react-query"
import { ArrowRight, FileBarChart2, History, Landmark, type LucideIcon, ScrollText, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import auditService from "@/api/audit/audit.service"
import { FEE_REPORT_KINDS, type FeeReportKind } from "@/api/fees/fee-reports.service"
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
import { StudentReportsPanel } from "@/features/management/student-reports"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useCan } from "@/lib/access"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
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

type ReportTab = { value: string; label: string; icon: LucideIcon }

/**
 * Reports (SRS §8, §9). Student reports (list, admissions, class distribution, status and
 * promotion records) for Super Admin + Operations Manager; fee reports for Super Admin +
 * Accountant (own receipts only); the audit trail for Super Admin + Operations Manager.
 * The Financial Report and exam documents live in their own sections and are linked here.
 */
export function Reports() {
  const actor = useActor()
  const can = useCan()
  const students = can("students.manage")
  const fees = can("fees.reports")
  const audit = can("audit.read")
  const finance = can("finance.reports")
  const exams = can("exams.create")

  const tabs = useMemo(() => {
    const list: ReportTab[] = []
    if (students) list.push({ value: "students", label: "Student reports", icon: Users })
    if (fees) list.push({ value: "fees", label: "Fee reports", icon: FileBarChart2 })
    if (audit) list.push({ value: "audit", label: "Audit trail", icon: History })
    return list
  }, [students, fees, audit])
  const allowed = useMemo(() => {
    if (tabs.length) return tabs.map((t) => t.value)
    return ["none"]
  }, [tabs])
  const [view, setView] = useUrlTab(allowed, "tab")
  let feeKinds: FeeReportKind[] = ["daily"]
  if (actor.role === "super_admin") feeKinds = ALL_KINDS

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ReportPageHeader title="Reports" subtitle="School reports for your role" />
        <EmptyState
          title="No reports for your role"
          detail="Reports are available to the Super Admin, Operations Manager and Accountant. Attendance registers can be printed from Student attendance."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportPageHeader title="Reports" subtitle="Students, fee collections and a traceable audit history" />
      {(finance || exams) && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Related reports">
          {finance && (
            <ReportLink
              to={`${portalPath(actor.role, "finance")}?tab=report`}
              icon={Landmark}
              title="Financial report"
              detail="Income, expenses and net position by month, quarter or year"
            />
          )}
          {exams && (
            <ReportLink
              to={portalPath(actor.role, "exams")}
              icon={ScrollText}
              title="Exam documents"
              detail="Result sheets, DMCs and award lists from each examination"
            />
          )}
        </div>
      )}
      {tabs.length > 1 && <ClsSubTabs aria-label="Reports" wrap value={view} onValueChange={setView} items={tabs} />}
      {view === "students" && students && <StudentReportsPanel />}
      {view === "fees" && fees && <FeeReportsPanel kinds={feeKinds} />}
      {view === "audit" && audit && <AuditTrail />}
    </div>
  )
}

function ReportLink({ to, icon: Icon, title, detail }: { to: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Link
      to={to}
      className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-colors hover:bg-[var(--brand-100)]/40 focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:outline-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-100)] text-[var(--primary-color)]">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--cls-ink)]">{title}</span>
        <span className="block truncate text-xs text-[var(--cls-muted)]">{detail}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-[var(--cls-muted)]" aria-hidden />
    </Link>
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
