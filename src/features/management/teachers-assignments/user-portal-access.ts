import type { Role } from "@/lib/auth"
import { can } from "@/lib/permissions"

export type PortalAccessItem = {
  id: string
  label: string
  description: string
  section: string
}

function pushIf(
  items: PortalAccessItem[],
  allowed: boolean,
  item: PortalAccessItem
) {
  if (allowed) items.push(item)
}

export function portalAccessForRole(role: Role): PortalAccessItem[] {
  const items: PortalAccessItem[] = []

  pushIf(items, can(role, "academic.manage"), {
    id: "academic",
    label: "Academic management",
    description: "Sessions, classes, subjects, and timetable setup.",
    section: "classes",
  })
  pushIf(items, can(role, "admissions.manage"), {
    id: "admissions",
    label: "Admissions",
    description: "Applications, interviews, and enrollment.",
    section: "admissions",
  })
  pushIf(items, can(role, "absences.manage"), {
    id: "substitutes",
    label: "Substitutes & absences",
    description: "Teacher absences and cover assignments.",
    section: "substitutes",
  })
  pushIf(items, can(role, "lessons.review"), {
    id: "lesson-review",
    label: "Lesson review",
    description: "Review daily lesson submissions from teachers.",
    section: "lesson-review",
  })
  pushIf(items, can(role, "tests.schedule"), {
    id: "weekly-tests",
    label: "Weekly tests",
    description: "Test schedules and publishing.",
    section: "weekly-tests",
  })
  pushIf(items, can(role, "exams.manage"), {
    id: "exams",
    label: "Examinations",
    description: "Exam sessions and results workflow.",
    section: "exams",
  })
  pushIf(items, can(role, "fees.payments.record"), {
    id: "collect-fee",
    label: "Collect fee",
    description: "Record and confirm fee payments.",
    section: "collect-fee",
  })
  pushIf(items, can(role, "fees.status.view"), {
    id: "fees",
    label: "Fee status",
    description: "View fee collection and student balances.",
    section: "fees",
  })
  pushIf(items, can(role, "finance.manage"), {
    id: "finance",
    label: "Finance",
    description: "School finance overview and reporting.",
    section: "finance",
  })

  return items
}
