import { api } from "@/lib/api"

export type BlockDateRow = {
  id: number
  name: string
  dateType: "single" | "multiple"
  startDate: string
  endDate: string
  description?: string | null
}

export type LocationRow = {
  id: number
  name: string
  roomName: string
  selectionType: "home" | "away"
  locationType?: string | null
  description?: string | null
  capacity: number
}

const schoolCatalogService = {
  listBlockDates: (params?: { search?: string; archived?: boolean }) =>
    api.get<BlockDateRow[]>("/settings/block-dates", {
      search: params?.search,
      archived: params?.archived ? "1" : undefined,
    }),
  createBlockDate: (body: {
    name: string
    startDate: string
    endDate: string
    description?: string
  }) => api.post<BlockDateRow>("/settings/block-dates", body),
  updateBlockDate: (
    id: number,
    body: { name?: string; startDate?: string; endDate?: string; description?: string | null }
  ) => api.put<BlockDateRow>(`/settings/block-dates/${id}`, body),
  archiveBlockDate: (id: number) =>
    api.delete<void>(`/settings/block-dates/${id}`),
  restoreBlockDate: (id: number) =>
    api.post<BlockDateRow>(`/settings/block-dates/${id}/restore`, {}),

  listLocations: (params?: { search?: string; archived?: boolean }) =>
    api.get<LocationRow[]>("/settings/locations", {
      search: params?.search,
      archived: params?.archived ? "1" : undefined,
    }),
  createLocation: (body: {
    name: string
    roomName: string
    selectionType: "home" | "away"
    locationType?: string | null
    capacity: number
    description?: string | null
  }) => api.post<LocationRow>("/settings/locations", body),
  archiveLocation: (id: number) => api.delete<void>(`/settings/locations/${id}`),
  restoreLocation: (id: number) =>
    api.post<LocationRow>(`/settings/locations/${id}/restore`, {}),
}

export default schoolCatalogService
