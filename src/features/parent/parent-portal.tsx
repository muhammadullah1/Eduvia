import { ParentAttendance } from "./parent-attendance"
import { ParentFees } from "./parent-fees"
import { ParentHome } from "./parent-home"
import { ParentResults } from "./parent-results"
import { ParentTests } from "./parent-tests"
import { ParentTimetable } from "./parent-timetable"
import { ParentUpdates } from "./parent-updates"

export function ParentPortal({ section }: { section: string }) {
  if (section === "attendance") return <ParentAttendance />
  if (section === "results") return <ParentResults />
  if (section === "tests") return <ParentTests />
  if (section === "fees") return <ParentFees />
  if (section === "timetable") return <ParentTimetable />
  if (section === "updates") return <ParentUpdates />
  return <ParentHome />
}
