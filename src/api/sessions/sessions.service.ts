import { api } from "@/lib/api"

export type SessionDto = {
  id: number
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export type CreateSessionBody = {
  name: string
  startDate: string
  endDate: string
  isCurrent?: boolean
}

export type UpdateSessionBody = Partial<CreateSessionBody>

const sessionsService = {
  list: () => api.get<SessionDto[]>("/sessions"),

  create: (body: CreateSessionBody) =>
    api.post<SessionDto>("/sessions", {
      ...body,
      isCurrent: body.isCurrent ?? false,
    }),

  update: (id: number, body: UpdateSessionBody) =>
    api.patch<SessionDto>(`/sessions/${id}`, body),

  activate: (id: number) =>
    api.post<SessionDto>(`/sessions/${id}/activate`, {}),

  remove: (id: number) => api.delete<void>(`/sessions/${id}`),
}

export default sessionsService
