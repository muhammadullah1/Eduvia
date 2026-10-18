import { useQuery } from "@tanstack/react-query"

import teachersService from "@/api/teachers/teachers.service"
import { loadAuth } from "@/lib/auth"

export const TEACHER_DETAIL_QUERY_KEY = "teacher-detail"

export function useTeacherDetail(teacherId: string | undefined, enabled: boolean) {
  const numericId = teacherId ? Number(teacherId) : NaN
  const valid = Number.isFinite(numericId)

  return useQuery({
    queryKey: [TEACHER_DETAIL_QUERY_KEY, teacherId],
    enabled: enabled && valid && Boolean(loadAuth()?.token),
    queryFn: () => teachersService.getById(numericId),
  })
}
