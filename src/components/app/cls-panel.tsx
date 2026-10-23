import type { ReactNode } from "react"

import { TableCell, TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/** White bordered card used by the admissions-style list pages. */
export function ClsPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
        className
      )}
    >
      {children}
    </div>
  )
}

/** Panel header strip: title on the left, actions on the right. */
export function ClsPanelHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--cls-ink)]">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-[var(--cls-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function ClsStatCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string
  value: string | number
  hint?: string
  accent?: "default" | "brand" | "warning" | "success"
}) {
  const valueClass =
    accent === "brand"
      ? "text-[var(--cls-brand)]"
      : accent === "warning"
        ? "text-amber-700"
        : accent === "success"
          ? "text-emerald-700"
          : "text-[var(--cls-ink)]"

  return (
    <div className="rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", valueClass)}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--cls-muted)]">{hint}</p> : null}
    </div>
  )
}

/** Header row + cell styling shared with the admissions table. */
export const clsHeadRowClass = "border-[var(--cls-border)] bg-[var(--page-wash)]/80 hover:bg-[var(--page-wash)]/80"
export const clsRowClass = "border-[var(--cls-border)] hover:bg-[var(--page-wash)]/80"

export function ClsTh({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <TableHead
      className={cn("h-11 text-xs font-semibold tracking-wide text-[var(--cls-muted)] uppercase", className)}
    >
      {children}
    </TableHead>
  )
}

/** Compact, left-aligned "Action" column header; pair with ClsActionCell so the label sits over the buttons. Give it a fixed width. */
export function ClsActionTh({ className, label = "Action" }: { className?: string; label?: string }) {
  return <ClsTh className={cn("text-left", className)}>{label}</ClsTh>
}

/** Cell for row buttons, aligned with ClsActionTh. */
export function ClsActionCell({ className, children }: { className?: string; children?: ReactNode }) {
  return <TableCell className={cn("text-left", className)}>{children}</TableCell>
}

export function ClsEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-base font-medium text-[var(--cls-ink)]">{title}</p>
      {children ? <div className="max-w-md text-sm text-[var(--cls-muted)]">{children}</div> : null}
    </div>
  )
}
