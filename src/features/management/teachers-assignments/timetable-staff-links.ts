import type { Role } from "@/lib/auth"
import { portalPath } from "@/lib/auth"

/** Deep-link to Timetable → Teacher view with a teacher profile selected. */
export function timetableTeacherHref(actorRole: Role, teacherProfileId: string) {
  const base = portalPath(actorRole, "timetable")
  const params = new URLSearchParams({
    view: "teacher",
    teacherId: teacherProfileId,
  })
  return `${base}?${params.toString()}`
}
