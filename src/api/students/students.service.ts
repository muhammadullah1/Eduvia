import { api } from "@/lib/api"
import type { ApiStudent, ApiStudentDetail } from "@/lib/api-types"

export type StudentsListParams = {
  classId?: number
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export type StudentsListResponse = {
  students: ApiStudent[]
  pagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

const studentsService = {
  list: (params?: StudentsListParams) =>
    api.get<StudentsListResponse>("/students", params),

  get: (id: number) => api.get<ApiStudentDetail>(`/students/${id}`),
}

export default studentsService
