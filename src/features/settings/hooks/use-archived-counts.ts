import { useQuery } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import sessionsService from "@/api/sessions/sessions.service"
import schoolCatalogService from "@/api/settings/school-catalog.service"
import subjectsService from "@/api/subjects/subjects.service"
import usersService from "@/api/users/users.service"

export function useArchivedCounts() {
  const sessionsQuery = useQuery({
    queryKey: ["sessions", "list"],
    queryFn: () => sessionsService.list(),
  })
  const currentSession = (sessionsQuery.data ?? []).find((s) => s.isCurrent)
  const sessionId = currentSession?.id

  const classesQuery = useQuery({
    queryKey: ["classes", "archived", sessionId],
    enabled: Boolean(sessionId),
    queryFn: () => classesService.list({ sessionId, archived: true }),
  })
  const subjectsQuery = useQuery({
    queryKey: ["subjects", "archived"],
    queryFn: () => subjectsService.list({ archived: true }),
  })
  const staffQuery = useQuery({
    queryKey: ["users", "archived"],
    queryFn: () => usersService.list({ archived: true, pageSize: 200 }),
  })
  const locationsQuery = useQuery({
    queryKey: ["locations", "archived"],
    queryFn: () => schoolCatalogService.listLocations({ archived: true }),
  })
  const datesQuery = useQuery({
    queryKey: ["block-dates", "archived"],
    queryFn: () => schoolCatalogService.listBlockDates({ archived: true }),
  })

  const classesCount = classesQuery.data?.length ?? 0
  const subjectsCount = subjectsQuery.data?.length ?? 0
  const staffCount = staffQuery.data?.users?.length ?? 0
  const locationsCount = locationsQuery.data?.length ?? 0
  const datesCount = datesQuery.data?.length ?? 0
  const total =
    classesCount + subjectsCount + staffCount + locationsCount + datesCount

  return {
    classes: classesCount,
    subjects: subjectsCount,
    staff: staffCount,
    locations: locationsCount,
    dates: datesCount,
    total,
    isLoading:
      sessionsQuery.isLoading ||
      classesQuery.isLoading ||
      subjectsQuery.isLoading ||
      staffQuery.isLoading ||
      locationsQuery.isLoading ||
      datesQuery.isLoading,
  }
}
