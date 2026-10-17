import {
  AddTeamIcon,
  BankIcon,
  Books02Icon,
  Calendar02Icon,
  ChartBreakoutCircleIcon,
  ClipboardClockIcon,
  ClipboardPenIcon,
  CloudSyncIcon,
  CourseIcon,
  CreditCardIcon,
  DashboardSquare02Icon,
  GraduationCapIcon,
  ReplaceIcon,
  RepositoryIcon,
  Settings02Icon,
  TeachingIcon,
  TimeScheduleIcon,
  TimelineEventIcon,
  UserCheck01Icon,
  WorkflowIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import type { ComponentType } from "react"

export type NavIcon = ComponentType<{ className?: string }>

function icon(glyph: IconSvgElement): NavIcon {
  return function OfficialNavIcon({ className }: { className?: string }) {
    return (
      <HugeiconsIcon
        icon={glyph}
        className={className}
        size={18}
        strokeWidth={1.75}
      />
    )
  }
}

export const navIcons = {
  dashboard: icon(DashboardSquare02Icon),
  sessions: icon(Calendar02Icon),
  classes: icon(CourseIcon),
  subjects: icon(Books02Icon),
  staff: icon(TeachingIcon),
  timetable: icon(TimeScheduleIcon),
  substitutes: icon(ReplaceIcon),
  lessonPlan: icon(TimelineEventIcon),
  dailyTests: icon(ClipboardClockIcon),
  admissions: icon(AddTeamIcon),
  students: icon(GraduationCapIcon),
  enrollment: icon(ChartBreakoutCircleIcon),
  lifecycle: icon(WorkflowIcon),
  attendance: icon(UserCheck01Icon),
  exams: icon(ClipboardPenIcon),
  fees: icon(CreditCardIcon),
  offline: icon(CloudSyncIcon),
  finance: icon(BankIcon),
  reports: icon(RepositoryIcon),
  settings: icon(Settings02Icon),
}
