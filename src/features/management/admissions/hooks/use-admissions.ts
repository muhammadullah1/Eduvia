import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import applicationsService from "@/api/admissions/applications.service"
import {
  ADMISSION_CHECKLIST_QUERY_KEY,
  ADMISSION_DETAIL_QUERY_KEY,
  ADMISSIONS_QUERY_KEY,
  ADMISSIONS_SUMMARY_QUERY_KEY,
} from "@/api/admissions/constants"
import type { AdmissionStatusFilter } from "@/features/management/admissions/admission-display"
import { mapApplicationDto } from "@/api/admissions/map-application"
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"
import { buildApplicationsListRequest } from "@/features/management/admissions/admission-list-params"
import type { ListApplicationsRequest } from "@/types/admissions/api/request"
import { loadAuth } from "@/lib/auth"

export { DEFAULT_PAGE_SIZE }

export function useGetApplications(
  params?: ListApplicationsRequest,
  options?: { enabled?: boolean }
) {
  const stableKey = useMemo(() => params ?? {}, [params])

  return useQuery({
    queryKey: [ADMISSIONS_QUERY_KEY, stableKey],
    enabled: (options?.enabled ?? true) && Boolean(loadAuth()?.token),
    queryFn: async () => {
      const data = await applicationsService.list(stableKey)
      return {
        applications: data.applications.map(mapApplicationDto),
        pagination: data.pagination,
      }
    },
  })
}

export function useAdmissionsListPage(input: {
  page: number
  pageSize: number
  q?: string
  statusFilter: AdmissionStatusFilter
}) {
  const request = useMemo(
    () =>
      buildApplicationsListRequest({
        page: input.page,
        pageSize: input.pageSize,
        q: input.q,
        statusFilter: input.statusFilter,
      }),
    [input.page, input.pageSize, input.q, input.statusFilter]
  )

  const query = useGetApplications(request)

  return {
    ...query,
    applications: query.data?.applications ?? [],
    pagination: query.data?.pagination ?? {
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: 0,
    },
  }
}

export function useAdmissionStatusCounts() {
  return useQuery({
    queryKey: [ADMISSIONS_SUMMARY_QUERY_KEY],
    enabled: Boolean(loadAuth()?.token),
    queryFn: () => applicationsService.summary(),
    staleTime: 30_000,
  })
}

export function useGetApplication(id: number | undefined) {
  return useQuery({
    queryKey: [ADMISSION_DETAIL_QUERY_KEY, id],
    enabled: Number.isFinite(id) && (id ?? 0) > 0 && Boolean(loadAuth()?.token),
    queryFn: async () => {
      const dto = await applicationsService.getById(id!)
      return mapApplicationDto(dto)
    },
  })
}

/** The required admission documents a new application starts with (served by the API). */
export function useAdmissionChecklist() {
  return useQuery({
    queryKey: [ADMISSION_CHECKLIST_QUERY_KEY],
    enabled: Boolean(loadAuth()?.token),
    staleTime: Infinity,
    queryFn: () => applicationsService.documentChecklist(),
  })
}
