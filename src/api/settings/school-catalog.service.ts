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
  fkSessionId: number
  name: string
  locationCode?: string | null
  locationType?: string | null
  description?: string | null
  capacity: number
}

export type SchoolProfile = {
  id: number
  name: string
  code: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  status?: string | null
  /** Storage key of the uploaded logo (JPEG), or null for the default crest. */
  logo?: string | null
  /** Short-lived signed link to the logo, or null. */
  logoUrl?: string | null
}

export type SchoolProfileUpdate = { name: string; phone: string; email: string; address: string; website: string }
export type SchoolLogoUpdate = { logo: string | null }

const schoolCatalogService = {
  getCurrentSchool: () => api.get<SchoolProfile>("/schools/current"),
  updateCurrentSchool: (body: Partial<SchoolProfileUpdate> | SchoolLogoUpdate) =>
    api.patch<SchoolProfile>("/schools/current", body),
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

  listLocations: (params?: {
    search?: string
    archived?: boolean
    sessionId?: number
  }) =>
    api.get<LocationRow[]>("/settings/locations", {
      search: params?.search,
      archived: params?.archived ? "1" : undefined,
      sessionId: params?.sessionId,
    }),
  createLocation: (body: {
    name: string
    fkSessionId: number
    locationCode?: string | null
    locationType?: string | null
    capacity: number
    description?: string | null
  }) => api.post<LocationRow>("/settings/locations", body),
  updateLocation: (
    id: number,
    body: {
      name?: string
      locationCode?: string | null
      locationType?: string | null
      capacity?: number
      description?: string | null
    }
  ) => api.put<LocationRow>(`/settings/locations/${id}`, body),
  archiveLocation: (id: number) => api.delete<void>(`/settings/locations/${id}`),
  restoreLocation: (id: number) =>
    api.post<LocationRow>(`/settings/locations/${id}/restore`, {}),
}

export default schoolCatalogService
