import { api } from "@/lib/api"
import type { ApiTimetableSlot } from "@/lib/api-types"

const timetableService = {
  listByClass: (classId: number) =>
    api.get<ApiTimetableSlot[]>("/timetable", { classId }),
}

export default timetableService
