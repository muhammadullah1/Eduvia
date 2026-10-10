import {
  ADMISSION_DETAIL_QUERY_KEY,
  ADMISSIONS_QUERY_KEY,
} from "@/api/admissions/constants"
import { queryClient } from "@/lib/query-client"

export async function invalidateAdmissionsLists() {
  await queryClient.invalidateQueries({ queryKey: [ADMISSIONS_QUERY_KEY] })
}

export async function invalidateAdmissionDetail(id: string | number) {
  const numeric = Number(id)
  if (!Number.isFinite(numeric) || numeric <= 0) return
  await queryClient.invalidateQueries({
    queryKey: [ADMISSION_DETAIL_QUERY_KEY, numeric],
  })
}
