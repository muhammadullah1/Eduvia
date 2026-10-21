import type { QueryClient } from "@tanstack/react-query"

import { invalidateClassesList } from "@/features/management/classes/hooks/use-classes"
import { invalidateClassTimetable } from "@/features/management/classes/hooks/use-class-detail-queries"
import { invalidateSubjectsList } from "@/features/management/subjects/hooks/use-subjects"

/** Keep React Query and portal `state.slots` aligned after timetable mutations. */
export async function refreshTimetableData(
  queryClient: QueryClient,
  options: {
    classId?: string
    syncPortal: () => Promise<void>
    refreshClassList?: boolean
  }
) {
  await invalidateClassTimetable(queryClient, options.classId)
  await invalidateSubjectsList(queryClient)
  if (options.refreshClassList) {
    await invalidateClassesList(queryClient)
  }
  await options.syncPortal()
}
