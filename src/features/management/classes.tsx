import { useNavigate, useParams } from "react-router-dom"

import { ClassesPage } from "@/features/management/classes/classes-page"
import { ClassDetailPage } from "@/features/management/classes/class-detail-page"
import {
  parseClassDetailTab,
  type ClassDetailTabId,
} from "@/features/management/classes/class-detail-tabs"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

export function Classes({ query }: { query: string }) {
  const navigate = useNavigate()
  const actor = useActor()
  const params = useParams()
  const splat = params["*"] ?? ""
  const segments = splat.split("/").filter(Boolean)
  const classId = segments[0] ?? ""
  const tab = parseClassDetailTab(segments[1])

  function openClass(id: string) {
    navigate(portalPath(actor.role, "classes", id))
  }

  function setTab(next: ClassDetailTabId) {
    navigate(portalPath(actor.role, "classes", `${classId}/${next}`))
  }

  function backToList() {
    navigate(portalPath(actor.role, "classes"))
  }

  if (classId) {
    return (
      <ClassDetailPage
        classId={classId}
        tab={tab}
        onTabChange={setTab}
        onBack={backToList}
      />
    )
  }

  return <ClassesPage globalQuery={query} onOpenClass={openClass} />
}
