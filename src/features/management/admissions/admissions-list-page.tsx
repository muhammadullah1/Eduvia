import { Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"
import type { Application } from "@/data/types"
import type { ClassSection } from "@/data/types"

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
import { useAdmissionsListPage } from "./hooks/use-admissions"

type Props = {
  classes: ClassSection[]
  sessionLabel: string
  globalQuery: string
  onOpenApplication: (app: Application) => void
  onNewApplication: () => void
}

function buildStatusCounts(
  applications: Application[],
  totalForAll: number,
  statusFilter: AdmissionStatusFilter,
  filteredTotal: number
) {
  const counts: Record<AdmissionStatusFilter, number> = {
    all: statusFilter === "all" ? totalForAll : applications.length,
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
  if (statusFilter !== "all") {
    counts[statusFilter] = filteredTotal
  }
  return counts
}

export function AdmissionsListPage({
  classes,
  sessionLabel,
  globalQuery,
  onOpenApplication,
  onNewApplication,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<AdmissionStatusFilter>("all")
  const [viewMode, setViewMode] = useState<AdmissionsViewMode>("table")
  const [tableSearch, setTableSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [debouncedQ, setDebouncedQ] = useState("")

  const rawSearch = tableSearch || globalQuery

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(rawSearch), 300)
    return () => window.clearTimeout(handle)
  }, [rawSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, statusFilter, pageSize])

  const { applications, pagination, isLoading, isFetching, isError } =
    useAdmissionsListPage({
      page,
      pageSize,
      q: debouncedQ,
      statusFilter,
    })

  const counts = useMemo(
    () =>
      buildStatusCounts(
        applications,
        pagination.total,
        statusFilter,
        pagination.total
      ),
    [applications, pagination.total, statusFilter]
  )

  const inProgressOnPage = useMemo(
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

  const empty = !isLoading && applications.length === 0

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
          value={statusFilter === "all" ? pagination.total : pagination.total}
          hint={
            statusFilter === "all"
              ? "All statuses"
              : "Matching current filter"
          }
        />
        <AdmissionsStatCard
          label="In progress"
          value={inProgressOnPage}
          hint="On this page"
          accent="warning"
        />
        <AdmissionsStatCard
          label="Admitted"
          value={counts.admitted}
          hint="On this page"
          accent="success"
        />
        <AdmissionsStatCard
          label="Under review"
          value={counts.under_review}
          hint="On this page"
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

        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-base font-medium text-[var(--cls-ink)]">
              Could not load applications
            </p>
            <p className="max-w-sm text-sm text-[var(--cls-muted)]">
              Check your connection and try again.
            </p>
          </div>
        ) : empty ? (
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
          <>
            <div className="p-4">
              <AdmissionsPipeline
                applications={applications}
                classes={classes}
                onOpen={onOpenApplication}
              />
            </div>
            <PaginationComponent
              pagination={{
                total: pagination.total,
                page: pagination.page,
                pageSize: pagination.pageSize,
                totalPages: pagination.totalPages,
                onPageChange: setPage,
                onPageSizeChange: (size) => {
                  setPageSize(size)
                  setPage(1)
                },
              }}
            />
          </>
        ) : (
          <AdmissionsDataTable
            rows={applications}
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
            loading={isLoading || isFetching}
            pagination={{
              total: pagination.total,
              page: pagination.page,
              pageSize: pagination.pageSize,
              totalPages: pagination.totalPages,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size)
                setPage(1)
              },
            }}
          />
        )}
      </AdmissionsPanel>
    </div>
  )
}
