import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { TeachersAssignmentsPage } from "@/features/management/teachers-assignments/teachers-assignments-page"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

export function TeachersAssignments({ query }: { query: string }) {
  const navigate = useNavigate()
  const actor = useActor()
  const params = useParams()
  const splat = params["*"] ?? ""
  const segments = splat.split("/").filter(Boolean)
  const legacyUserId = segments[0] ?? ""

  useEffect(() => {
    if (!legacyUserId) return
    navigate(portalPath(actor.role, "teachers-assignments"), { replace: true })
  }, [legacyUserId, actor.role, navigate])

  return (
    <TeachersAssignmentsPage
      globalQuery={query}
      initialTeacherId={legacyUserId || undefined}
    />
  )
}
