import { api } from "@/lib/api"
import type { ApiTimetableSlot } from "@/lib/api-types"

export type CreateTimetableSlotPayload = {
  fkClassId: number
  day: string
  time: string
  periodIndex: number
  fkSubjectId: number
  fkTeacherId?: number | null
  room?: string | null
}

export type UpdateTimetableSlotPayload = Partial<
  Omit<CreateTimetableSlotPayload, "fkClassId">
> & {
  fkClassId?: number
}

const timetableService = {
  listAll: () => api.get<ApiTimetableSlot[]>("/timetable"),
  listByClass: (classId: number) =>
    api.get<ApiTimetableSlot[]>("/timetable", { classId }),
  create: (payload: CreateTimetableSlotPayload) =>
    api.post<ApiTimetableSlot>("/timetable", payload),
  createBatch: (payload: {
    fkClassId: number
    days: string[]
    time: string
    periodIndex: number
    fkSubjectId: number
    fkTeacherId?: number | null
    room?: string | null
  }) => api.post<ApiTimetableSlot[]>("/timetable/batch", payload),
  update: (id: number, payload: UpdateTimetableSlotPayload) =>
    api.patch<ApiTimetableSlot>(`/timetable/${id}`, payload),
  remove: (id: number) => api.delete(`/timetable/${id}`),
}

export default timetableService
