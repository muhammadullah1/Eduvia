import { useQuery } from "@tanstack/react-query"

import teachersService from "@/api/teachers/teachers.service"
import type { ApiTeacher } from "@/lib/api-types"

export const TEACHERS_LIST_QUERY_KEY = "teachers-list"

export type SubstituteTeacherOption = {
  id: string
  name: string
  subject: string
  subjectId: string
  classIds: string[]
}

export function mapTeacherToOption(t: ApiTeacher): SubstituteTeacherOption {
  return {
    id: String(t.id),
    name:
      `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`.trim() ||
      t.employeeCode ||
      `Teacher #${t.id}`,
    subject: t.subject?.name ?? "",
    subjectId: t.subject?.id != null ? String(t.subject.id) : "",
    classIds: (t.classes ?? []).map((c) => String(c.id)),
  }
}

export function useTeachersList(enabled = true) {
  return useQuery({
    queryKey: [TEACHERS_LIST_QUERY_KEY],
    enabled,
    queryFn: async () => {
      const rows = await teachersService.list()
      return (rows ?? []).map(mapTeacherToOption)
    },
    staleTime: 60_000,
  })
}
