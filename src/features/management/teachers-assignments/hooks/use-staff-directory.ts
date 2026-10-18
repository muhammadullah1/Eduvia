import { useQuery, useQueryClient } from "@tanstack/react-query"

import { TEACHERS_QUERY_KEY } from "@/api/teachers/constants"
import teachersService from "@/api/teachers/teachers.service"
import { USERS_QUERY_KEY } from "@/api/users/constants"
import usersService from "@/api/users/users.service"
import { buildStaffDirectory } from "@/api/staff/map-staff-directory"
import { loadAuth } from "@/lib/auth"

export function useStaffDirectory() {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, TEACHERS_QUERY_KEY, "directory"],
    enabled: Boolean(loadAuth()?.token),
    queryFn: async () => {
      const [usersPayload, teachers] = await Promise.all([
        usersService.list({ pageSize: 500 }),
        teachersService.list(),
      ])
      const users = usersPayload.users ?? []
      return buildStaffDirectory(users, teachers ?? [])
    },
  })
}

export function invalidateStaffDirectory(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return queryClient.invalidateQueries({
    queryKey: [USERS_QUERY_KEY, TEACHERS_QUERY_KEY, "directory"],
  })
}
