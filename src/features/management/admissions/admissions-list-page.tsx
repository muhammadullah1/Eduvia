import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { Application } from "@/data/types"
import type { ClassSection } from "@/data/types"
import { classLabel } from "@/lib/format"

import { AdmissionStatusFilters } from "./admission-status-filters"
import {
  AdmissionsPanel,
  AdmissionsStatCard,
} from "./admission-ui"
import {
  resolveAdmissionUiStatus,
  type AdmissionStatusFilter,
} from "./admission-display"
import { AdmissionsDataTable } from "./admissions-data-table"
import { AdmissionsPipeline } from "./admissions-pipeline"
import {
  AdmissionsViewToggle,
  type AdmissionsViewMode,
} from "./admissions-view-toggle"

type Props = {
  applications: Application[]
  classes: ClassSection[]
  sessionLabel: string
  globalQuery: string
  onOpenApplication: (app: Application) => void
  onNewApplication: () => void
}

function matchesSearch(
  app: Application,
  classes: ClassSection[],
  needle: string
) {
  if (!needle.trim()) return true
  const q = needle.trim().toLowerCase()
  return [
    app.id,
    app.name,
    app.guardian,
    app.phone,
    classLabel(classes, app.classId),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q)
}

function buildStatusCounts(applications: Application[]) {
  const counts: Record<AdmissionStatusFilter, number> = {
    all: applications.length,
    draft: 0,
    submitted: 0,
    under_review: 0,
    test_interview: 0,
    admitted: 0,
    rejected: 0,
    waitlisted: 0,
    withdrawn: 0,
  }
  for (const app of applications) {
    counts[resolveAdmissionUiStatus(app)] += 1
  }
  return counts
}

export function AdmissionsListPage({
  applications,
  classes,
  sessionLabel,
  globalQuery,
  onOpenApplication,
  onNewApplication,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<AdmissionStatusFilter>("all")
  const [viewMode, setViewMode] = useState<AdmissionsViewMode>("table")
  const [tableSearch, setTableSearch] = useState("")

  const search = tableSearch || globalQuery

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (
        statusFilter !== "all" &&
        resolveAdmissionUiStatus(app) !== statusFilter
      ) {
        return false
      }
      return matchesSearch(app, classes, search)
    })
  }, [applications, classes, search, statusFilter])

  const counts = useMemo(
    () => buildStatusCounts(applications),
    [applications]
  )

  const inProgress = useMemo(
    () =>
      applications.filter((app) => {
        const s = resolveAdmissionUiStatus(app)
        return (
          s === "submitted" ||
          s === "under_review" ||
          s === "test_interview" ||
          s === "waitlisted"
        )
      }).length,
    [applications]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">
            Admissions
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Manage applications for session {sessionLabel}. Track progress from
            submission through enrollment.
          </p>
        </div>
        <Button
          type="button"
          size="default"
          className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
          onClick={onNewApplication}
        >
          <Plus data-icon="inline-start" />
          New application
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdmissionsStatCard
          label="Total applications"
          value={applications.length}
          hint="All statuses"
        />
        <AdmissionsStatCard
          label="In progress"
          value={inProgress}
          hint="Submitted through waitlist"
          accent="warning"
        />
        <AdmissionsStatCard
          label="Admitted"
          value={counts.admitted}
          hint="Enrolled from admissions"
          accent="success"
        />
        <AdmissionsStatCard
          label="Under review"
          value={counts.under_review}
          accent="brand"
        />
      </div>

      <AdmissionsPanel noPadding>
        <div className="space-y-3 border-b border-[var(--cls-border)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--cls-ink)]">
              Filter by status
            </p>
            <AdmissionsViewToggle value={viewMode} onChange={setViewMode} />
          </div>
          <AdmissionStatusFilters
            value={statusFilter}
            onChange={setStatusFilter}
            counts={counts}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-base font-medium text-[var(--cls-ink)]">
              No applications match your filters
            </p>
            <p className="max-w-sm text-sm text-[var(--cls-muted)]">
              Try clearing the status filter or start a new admission
              application.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onNewApplication}
            >
              <Plus data-icon="inline-start" />
              New application
            </Button>
          </div>
        ) : viewMode === "pipeline" ? (
          <div className="p-4">
            <AdmissionsPipeline
              applications={filtered}
              classes={classes}
              onOpen={onOpenApplication}
            />
          </div>
        ) : (
          <AdmissionsDataTable
            rows={filtered}
            classes={classes}
            search={tableSearch}
            onSearchChange={setTableSearch}
            onOpen={onOpenApplication}
            onExport={() =>
              toast.message("Export will connect to the API later.")
            }
            onPrint={() =>
              toast.message("Print will connect to the API later.")
            }
            embedded
          />
        )}
      </AdmissionsPanel>
    </div>
  )
}
