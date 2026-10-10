import { TeacherAttendance } from "./teacher-attendance"
import { TeacherClasses } from "./teacher-classes"
import { TeacherDailyUpdate } from "./teacher-daily-update"
import { TeacherMarks } from "./teacher-marks"
import { TeacherToday } from "./teacher-today"
import { TeacherUpdates } from "./teacher-updates"
import { TeacherWeeklyTests } from "./teacher-weekly-tests"

export function TeacherPortal({
  section,
  onOpen,
}: {
  section: string
  onOpen: (section: string) => void
}) {
  if (section === "classes") return <TeacherClasses onOpen={onOpen} />
  if (section === "attendance") return <TeacherAttendance />
  if (section === "daily-update") return <TeacherDailyUpdate />
  if (section === "weekly-tests") return <TeacherWeeklyTests />
  if (section === "notices") return <TeacherUpdates />
  if (section === "marks") return <TeacherMarks />
  return <TeacherToday onOpen={onOpen} />
}
