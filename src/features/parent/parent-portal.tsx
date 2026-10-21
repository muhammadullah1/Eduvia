import { EmptyState } from "@/components/app/kit"
import { useSchool } from "@/data/store"

import { ParentAttendance } from "./parent-attendance"
import { ParentFees } from "./parent-fees"
import { ParentHome } from "./parent-home"
import { ParentResults } from "./parent-results"
import { ParentTests } from "./parent-tests"
import { ParentTimetable } from "./parent-timetable"
import { ParentUpdates } from "./parent-updates"

export function ParentPortal({ section }: { section: string }) {
  const { state } = useSchool()
  // Every parent screen reads the selected child, which arrives with the sync.
  if (state.students.length === 0) {
    return (
      <EmptyState
        title="Loading your child’s details…"
        detail="If this stays empty, ask the school office to link your account to your child."
      />
    )
  }
  if (section === "attendance") return <ParentAttendance />
  if (section === "results") return <ParentResults />
  if (section === "tests") return <ParentTests />
  if (section === "fees") return <ParentFees />
  if (section === "timetable") return <ParentTimetable />
  if (section === "updates") return <ParentUpdates />
  return <ParentHome />
}
