import { useNavigate, useParams } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { StaffDetailPage } from "@/features/management/teachers-assignments/staff-detail-page"
import { TeachersAssignmentsPage } from "@/features/management/teachers-assignments/teachers-assignments-page"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

export function TeachersAssignments({ query }: { query: string }) {
  const navigate = useNavigate()
  const actor = useActor()
  const params = useParams()
  const splat = params["*"] ?? ""
  const segments = splat.split("/").filter(Boolean)
  const userId = segments[0] ?? ""

  function openUser(row: StaffDirectoryRow) {
    navigate(portalPath(actor.role, "teachers-assignments", row.id))
  }

  function backToList() {
    navigate(portalPath(actor.role, "teachers-assignments"))
  }

  if (userId) {
    return <StaffDetailPage userId={userId} onBack={backToList} />
  }

  return (
    <TeachersAssignmentsPage globalQuery={query} onOpenUser={openUser} />
  )
}
