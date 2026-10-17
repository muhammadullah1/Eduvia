import { useMutation, useQueryClient } from "@tanstack/react-query"

import teacherAbsencesService from "@/api/teacher-absences/teacher-absences.service"
import { useSchool } from "@/data/store"
import type { Role } from "@/lib/auth"

import { TEACHER_ABSENCES_QUERY_KEY } from "./use-teacher-absences"

export function useSubstituteMutations(actorRole: Role) {
  const queryClient = useQueryClient()
  const { syncPortalForRoute } = useSchool()

  async function syncStoreAndQueries() {
    await syncPortalForRoute(actorRole, "substitutes")
    await queryClient.invalidateQueries({
      queryKey: [TEACHER_ABSENCES_QUERY_KEY],
    })
    await queryClient.invalidateQueries({
      queryKey: ["available-substitutes"],
    })
  }

  const markAbsent = useMutation({
    mutationFn: (body: {
      teacherId: number
      date: string
      periods: number[]
      notes?: string
    }) => teacherAbsencesService.markAbsent(body),
    onSuccess: async () => {
      await syncStoreAndQueries()
    },
  })

  const assign = useMutation({
    mutationFn: (payload: {
      absenceId: number
      substituteTeacherId: number
    }) =>
      teacherAbsencesService.assignSubstitute(payload.absenceId, {
        substituteTeacherId: payload.substituteTeacherId,
      }),
    onSuccess: async () => {
      await syncStoreAndQueries()
    },
  })

  const removeCover = useMutation({
    mutationFn: (absenceId: number) =>
      teacherAbsencesService.removeSubstitute(absenceId),
    onSuccess: async () => {
      await syncStoreAndQueries()
    },
  })

  const cancelAbsence = useMutation({
    mutationFn: (absenceId: number) =>
      teacherAbsencesService.cancel(absenceId),
    onSuccess: async () => {
      await syncStoreAndQueries()
    },
  })

  return { markAbsent, assign, removeCover, cancelAbsence }
}
