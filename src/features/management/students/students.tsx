import { useNavigate, useParams } from "react-router-dom"

import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

import { StudentDetailPage } from "./student-detail-page"
import { StudentsPage } from "./students-page"

/** /:portal/students lists students; /:portal/students/:id opens one. */
export function Students({ query }: { query: string }) {
  const navigate = useNavigate()
  const actor = useActor()
  const params = useParams()
  const studentId = (params["*"] ?? "").split("/").filter(Boolean)[0] ?? ""

  if (studentId) {
    return (
      <StudentDetailPage
        studentId={studentId}
        onBack={() => navigate(portalPath(actor.role, "students"))}
      />
    )
  }
  return (
    <StudentsPage
      query={query}
      onOpenStudent={(id) => navigate(portalPath(actor.role, "students", String(id)))}
    />
  )
}
