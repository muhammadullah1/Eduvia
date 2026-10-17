import { api } from "@/lib/api"
import type { ApiTeacher } from "@/lib/api-types"

const teachersService = {
  list: () => api.get<ApiTeacher[]>("/teachers"),

  getById: (teacherId: number) =>
    api.get<ApiTeacher>(`/teachers/${teacherId}`),

  changeSubject: (
    teacherId: number,
    body: { subjectId: number; reason?: string; effectiveFrom?: string }
  ) =>
    api.put<ApiTeacher>(`/teachers/${teacherId}/subject`, body),
}

export default teachersService
