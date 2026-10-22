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
  role: Role
  subjectId?: number
  gender?: "Male" | "Female" | "Other" | null
  employeeCode?: string | null
  photo?: string | null
  /** Optional; without it the user gets an email link to set one. */
  password?: string
}

const usersService = {
  list: (params?: {
    role?: Role
    page?: number
    pageSize?: number
    archived?: boolean
  }) =>
    api.get<UsersListResponse>("/users", {
      role: params?.role,
      page: params?.page,
      pageSize: params?.pageSize,
      archived: params?.archived ? "1" : undefined,
    }),


  create: (body: CreateStaffUserBody) =>
    api.post<ApiUser>("/users", body),

  resendInvitation: (userId: number) =>
    api.post<{ sent: boolean; email: string }>(
      `/users/${userId}/resend-invitation`,
      {}
    ),

  update: (
    userId: number,
    body: {
      firstName?: string
      lastName?: string
      phone?: string | null
      photo?: string | null
      gender?: "Male" | "Female" | "Other" | null
    }
  ) => api.patch<ApiUser>(`/users/${userId}`, body),

  remove: (userId: number) =>
    api.delete<{ deleted: boolean }>(`/users/${userId}`),

  restore: (userId: number) => api.post<ApiUser>(`/users/${userId}/restore`, {}),
}

export default usersService
