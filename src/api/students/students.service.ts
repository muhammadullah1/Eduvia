import { api } from "@/lib/api"
import type { ApiStudent } from "@/lib/api-types"

export type StudentsListParams = {
  classId?: number
  status?: string
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
}

export default studentsService
