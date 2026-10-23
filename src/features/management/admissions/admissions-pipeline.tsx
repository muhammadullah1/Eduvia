import type { Application } from "@/data/types"
import type { ClassSection } from "@/data/types"
import { classLabel, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  ADMISSION_STATUS_LABELS,
  type AdmissionUiStatus,
  resolveAdmissionUiStatus,
} from "./admission-display"
import { AdmissionStatusBadge } from "./admission-status-badge"

const PIPELINE_COLUMNS: AdmissionUiStatus[] = [
  "submitted",
  "under_review",
  "test_interview",
  "waitlisted",
  "admitted",
  "rejected",
]

const COLUMN_ACCENT: Partial<Record<AdmissionUiStatus, string>> = {
  submitted: "border-t-blue-500",
  under_review: "border-t-amber-500",
  test_interview: "border-t-amber-400",
  waitlisted: "border-t-indigo-500",
  admitted: "border-t-emerald-500",
  rejected: "border-t-red-500",
}

type Props = {
  applications: Application[]
  classes: ClassSection[]
  onOpen: (app: Application) => void
  /** School-wide totals per status; the cards below are only the current page. */
  totals?: Partial<Record<AdmissionUiStatus, number>>
}

export function AdmissionsPipeline({ applications, classes, onOpen, totals }: Props) {
  const columns = PIPELINE_COLUMNS.map((status) => ({
    status,
    label: ADMISSION_STATUS_LABELS[status],
    items: applications.filter(
      (app) => resolveAdmissionUiStatus(app) === status
    ),
  })).map((column) => ({
    ...column,
    total: Math.max(totals?.[column.status] ?? column.items.length, column.items.length),
  }))

  return (
    <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2">
      {columns.map((column) => (
        <section
          key={column.status}
          // Columns share the width and only scroll (inside this container) below ~11rem each (6 columns fit at 1440px).
          className="flex min-w-[11rem] flex-1 basis-0 flex-col gap-3"
        >
          <header className="flex items-center justify-between gap-2 px-0.5">
            <h3 className="text-sm font-semibold text-[var(--cls-ink)]">
              {column.label}
            </h3>
            <span
              className="rounded-md bg-[var(--page-wash)] px-2 py-0.5 text-xs font-medium text-[var(--cls-muted)]"
              title={
                column.total > column.items.length
                  ? `${column.items.length} of ${column.total} on this page`
                  : undefined
              }
            >
              {column.total}
            </span>
          </header>
          <div
            className={cn(
              "flex min-h-[280px] flex-col gap-2 rounded-xl border border-[var(--cls-border)] border-t-[3px] bg-[var(--page-wash)]/60 p-2",
              COLUMN_ACCENT[column.status]
            )}
          >
            {column.items.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-[var(--cls-muted)]">
                No applications
              </p>
            ) : (
              column.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item)}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-[var(--cls-border)] bg-white p-3 text-left shadow-sm",
                    "transition-all hover:border-[var(--cls-brand)]/40 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--cls-ink)]">
                      {item.name}
                    </span>
                    <AdmissionStatusBadge
                      status={column.status}
                      className="shrink-0 scale-90"
                    />
                  </div>
                  <span className="text-xs text-[var(--cls-muted)]">
                    {classLabel(classes, item.classId, item.classDisplay)}
                  </span>
                  <span className="text-xs text-[var(--cls-muted)]">
                    {item.guardian} · {item.phone}
                  </span>
                  {item.submittedOn ? (
                    <span className="text-[11px] text-[var(--cls-muted)]">
                      Submitted {formatDate(item.submittedOn)}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
