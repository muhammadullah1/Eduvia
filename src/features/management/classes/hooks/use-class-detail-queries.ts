import { type QueryClient,useQuery } from "@tanstack/react-query"

import { FEE_MONTHS_QUERY_KEY } from "@/api/fees/constants"
import feesService from "@/api/fees/fees.service"
import { mapFeeMonthDto } from "@/api/fees/map-fee-month"
import { STUDENTS_QUERY_KEY } from "@/api/students/constants"
import { mapStudentDto } from "@/api/students/map-student"
import studentsService from "@/api/students/students.service"
import { TIMETABLE_QUERY_KEY } from "@/api/timetable/constants"
import { mapTimetableSlotDto } from "@/api/timetable/map-timetable"
import timetableService from "@/api/timetable/timetable.service"
import { canReadSlice, sessionPermissions } from "@/data/portal-sync"
import type { FeeMonth, TimetableSlot } from "@/data/types"
import type { Student } from "@/data/types"
import { loadAuth } from "@/lib/auth"

function classNumericId(classId: string | undefined) {
  const n = Number(classId)
  return Number.isFinite(n) ? n : undefined
}

export function useClassStudentsQuery(
  classId: string | undefined,
  enabled = true
) {
  const numericId = classNumericId(classId)
  return useQuery({
    queryKey: [STUDENTS_QUERY_KEY, "by-class", numericId],
    enabled: enabled && Boolean(numericId) && Boolean(loadAuth()?.token),
    queryFn: async () => {
      const data = await studentsService.list({
        classId: numericId,
        pageSize: 500,
      })
      const rows = data.students ?? []
      return rows.map(mapStudentDto)
    },
  })
}

export function invalidateClassTimetable(
  queryClient: QueryClient,
  classId: string | undefined
) {
  const numericId = classNumericId(classId)
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: [TIMETABLE_QUERY_KEY, "school"],
    }),
  ]
  if (numericId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: [TIMETABLE_QUERY_KEY, "by-class", numericId],
      })
    )
  }
  return Promise.all(tasks)
}

export function useSchoolTimetableQuery(enabled = true) {
  return useQuery({
    queryKey: [TIMETABLE_QUERY_KEY, "school"],
    enabled: enabled && Boolean(loadAuth()?.token),
    queryFn: async () => {
      const rows = await timetableService.listAll()
      return (rows ?? []).map(mapTimetableSlotDto)
    },
  })
}

export function useClassTimetableQuery(
  classId: string | undefined,
  enabled = true
) {
  const numericId = classNumericId(classId)
  return useQuery({
    queryKey: [TIMETABLE_QUERY_KEY, "by-class", numericId],
    enabled: enabled && Boolean(numericId) && Boolean(loadAuth()?.token),
    queryFn: async () => {
      const rows = await timetableService.listByClass(numericId!)
      return (rows ?? []).map(mapTimetableSlotDto)
    },
  })
}

export function useFeeMonthsQuery(enabled = true) {
  return useQuery({
    queryKey: [FEE_MONTHS_QUERY_KEY],
    enabled:
      enabled &&
      Boolean(loadAuth()?.token) &&
      canReadSlice(sessionPermissions(), "feeMonths"),
    queryFn: async () => {
      const rows = await feesService.listMonths()
      return (rows ?? []).map(mapFeeMonthDto)
    },
    staleTime: 60_000,
  })
}

export type ClassDetailApiSlice = {
  students: Student[]
  slots: TimetableSlot[]
  feeMonths: FeeMonth[]
  studentsLoading: boolean
  slotsLoading: boolean
  feeMonthsLoading: boolean
  studentsError: boolean
  slotsError: boolean
  feeMonthsError: boolean
}
