import { FileSpreadsheet, FileText, Sheet } from "lucide-react"
import type { ReactNode } from "react"

import type { FeeReportFormat } from "@/api/fees/fee-reports.service"
import {
  PaginationComponent,
  type PaginationWithHandlers,
} from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * Layout pieces for report screens, matching the Classes and Subjects pages:
 * page title row, a white bordered panel with a toolbar strip, a washed table
 * header row and the shared pagination footer.
 */

export function ReportPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[var(--cls-muted)]">{subtitle}</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

/** White panel: optional toolbar strip, the body, optional pagination footer. */
export function ReportPanel({
  toolbar,
  children,
  pagination,
  className,
  ...rest
}: {
  toolbar?: ReactNode
  children: ReactNode
  pagination?: PaginationWithHandlers
  className?: string
  "data-testid"?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
        className
      )}
      {...rest}
    >
      {toolbar ? (
        <div className="border-b border-[var(--cls-border)] px-4 py-3">{toolbar}</div>
      ) : null}
      {children}
      {pagination && pagination.total > 0 ? (
        <PaginationComponent pagination={pagination} />
      ) : null}
    </div>
  )
}

/** Centered message inside a panel (loading, empty, error). */
export function ReportPanelMessage({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium text-[var(--cls-ink)]">{title}</p>
      {detail ? (
        <p className="max-w-md text-sm text-[var(--cls-muted)]">{detail}</p>
      ) : null}
      {action}
    </div>
  )
}

export const reportCellClass = "py-3.5 text-sm text-[var(--cls-ink)]"

export function ReportHeadRow({
  columns,
}: {
  columns: { key: string; label: string; numeric?: boolean }[]
}) {
  return (
    <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/90 hover:bg-[var(--page-wash)]/90">
      {columns.map((c) => (
        <TableHead
          key={c.key}
          className={cn(
            "h-11 text-xs font-semibold whitespace-nowrap text-[var(--cls-muted)]",
            c.numeric && "text-right"
          )}
        >
          {c.label}
        </TableHead>
      ))}
    </TableRow>
  )
}

const EXPORTS: { format: FeeReportFormat; label: string; icon: typeof FileText }[] = [
  { format: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { format: "csv", label: "CSV", icon: Sheet },
  { format: "pdf", label: "PDF", icon: FileText },
]

/** Excel / CSV / PDF download buttons; `busy` shows which one is preparing. */
export function ExportButtons({
  busy,
  disabled,
  onExport,
}: {
  busy: FeeReportFormat | null
  disabled?: boolean
  onExport: (format: FeeReportFormat) => void
}) {
  return (
    <>
      {EXPORTS.map(({ format, label, icon: Icon }) => (
        <Button
          key={format}
          type="button"
          variant="outline"
          className="border-[var(--cls-border)] bg-white"
          disabled={disabled || Boolean(busy)}
          onClick={() => onExport(format)}
        >
          <Icon data-icon="inline-start" />
          {busy === format ? "Preparing…" : label}
        </Button>
      ))}
    </>
  )
}
