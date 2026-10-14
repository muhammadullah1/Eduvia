import { api } from "@/lib/api"
import type { ApiUser } from "@/lib/api-types"
import type { Role } from "@/lib/auth"

export type UsersListResponse = {
  users: ApiUser[]
  pagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export type CreateStaffUserBody = {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  password: string
  role: Role
  subjectId?: number
  gender?: "Male" | "Female" | "Other" | null
  employeeCode?: string | null
}

const usersService = {
  list: (params?: { role?: Role; page?: number; pageSize?: number }) =>
    api.get<UsersListResponse>("/users", {
      role: params?.role,
      page: params?.page,
      pageSize: params?.pageSize,
    }),

  create: (body: CreateStaffUserBody) =>
    api.post<ApiUser>("/users", body),
}

export default usersService
