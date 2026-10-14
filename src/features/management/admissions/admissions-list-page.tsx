import { Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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
import {
  useAdmissionStatusCounts,
  useAdmissionsListPage,
} from "./hooks/use-admissions"

type Props = {
  classes: ClassSection[]
  sessionLabel: string
  globalQuery: string
  onOpenApplication: (app: Application) => void
  onNewApplication: () => void
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

  const { data: statusCounts } = useAdmissionStatusCounts()

  const { applications, pagination, isLoading, isFetching, isError } =
    useAdmissionsListPage({
      page,
      pageSize,
      q: debouncedQ,
      statusFilter,
    })

  const counts = statusCounts ?? {
    all: pagination.total,
    draft: 0,
    submitted: 0,
    under_review: 0,
    test_interview: 0,
    admitted: 0,
    rejected: 0,
    waitlisted: 0,
    withdrawn: 0,
  }

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

  const emptyResults = !isLoading && applications.length === 0

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
          value={counts.all}
          hint="All statuses"
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
          hint="School-wide"
          accent="success"
        />
        <AdmissionsStatCard
          label="Under review"
          value={counts.under_review}
          hint="School-wide"
          accent="brand"
        />
      </div>

      <AdmissionsPanel noPadding>
        <div className="border-b border-[var(--cls-border)] px-4 pt-4 pb-3">
          <AdmissionStatusFilters
            value={statusFilter}
            onChange={setStatusFilter}
            counts={counts}
            trailing={
              <AdmissionsViewToggle value={viewMode} onChange={setViewMode} />
            }
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
        ) : viewMode === "pipeline" ? (
          <>
            <div className="p-4">
              {emptyResults ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <p className="text-base font-medium text-[var(--cls-ink)]">
                    No applications match your filters
                  </p>
                  <p className="max-w-sm text-sm text-[var(--cls-muted)]">
                    Try a different status or clear your search.
                  </p>
                </div>
              ) : (
                <AdmissionsPipeline
                  applications={applications}
                  classes={classes}
                  onOpen={onOpenApplication}
                />
              )}
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
            embedded
            loading={isLoading || isFetching}
            emptyMessage={
              emptyResults
                ? "No applications match your filters. Try clearing search or choosing another status."
                : undefined
            }
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
