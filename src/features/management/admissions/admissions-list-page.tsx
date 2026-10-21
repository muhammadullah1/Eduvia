import { Plus, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"
import type { Application } from "@/data/types"
import type { ClassSection } from "@/data/types"

import {
  type AdmissionStatusFilter,
  resolveAdmissionUiStatus,
} from "./admission-display"
import { AdmissionStatusFilters } from "./admission-status-filters"
import {
  AdmissionsPanel,
  AdmissionsStatCard,
} from "./admission-ui"
import { AdmissionsDataTable } from "./admissions-data-table"
import { AdmissionsPipeline } from "./admissions-pipeline"
import {
  type AdmissionsViewMode,
  AdmissionsViewToggle,
} from "./admissions-view-toggle"
import {
  useAdmissionsListPage,
  useAdmissionStatusCounts,
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

      <AdmissionsPanel>
        <div className="border-b border-[var(--cls-border)] px-4 pt-4 pb-3">
          <AdmissionStatusFilters
            value={statusFilter}
            onChange={setStatusFilter}
            counts={counts}
            leading={
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
                <Input
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Search by name, reg. no., class…"
                  aria-label="Search applications"
                  className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
                />
              </div>
            }
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
                  totals={counts}
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
