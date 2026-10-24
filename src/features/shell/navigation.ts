import {
  Bell,
  BookOpen,
  Building2,
  Calculator,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { type ComponentType } from "react"

import { ALL_ROLES, type Role } from "@/lib/auth"

import { navIcons } from "./nav-icons"

type Icon = ComponentType<{ className?: string }>

export const roles: Record<
  Role,
  { label: string; short: string; description: string; icon: Icon }
> = {
  super_admin: {
    label: "Super Admin Portal",
    short: "Super Admin",
    description: "Full control, including overall fee totals",
    icon: Building2,
  },
  operations_manager: {
    label: "Operations Portal",
    short: "Operations Manager",
    description: "Academics, people, absences and results — no fee totals",
    icon: ShieldCheck,
  },
  accountant: {
    label: "Accountant Portal",
    short: "Accountant",
    description: "Record payments and print your daily receipts",
    icon: Calculator,
  },
  teacher: {
    label: "Teacher Portal",
    short: "Teacher",
    description: "Classes, attendance and academic delivery",
    icon: BookOpen,
  },
  parent: {
    label: "Parent Portal",
    short: "Parent",
    description: "A clear view of your child’s school journey",
    icon: UserRound,
  },
}

/** Shared by the super admin and the operations manager; fee sections are super-admin only. */
const managementNav: { id: string; label: string; icon: Icon }[] = [
  { id: "sessions", label: "Sessions", icon: navIcons.sessions },
  { id: "classes", label: "Classes", icon: navIcons.classes },
  { id: "subjects", label: "Subjects", icon: navIcons.subjects },
  {
    id: "teachers-assignments",
    label: "Staff",
    icon: navIcons.staff,
  },
  { id: "timetable", label: "Timetable", icon: navIcons.timetable },
  { id: "substitutes", label: "Substitutes", icon: navIcons.substitutes },
  { id: "lesson-plan", label: "Lesson Plan", icon: navIcons.lessonPlan },
  {
    id: "daily-test-schedule",
    label: "Daily Test Schedule",
    icon: navIcons.dailyTests,
  },
  { id: "admissions", label: "Admissions", icon: navIcons.admissions },
  { id: "students", label: "Students", icon: navIcons.students },
  {
    id: "enrollment-promotion",
    label: "Enrollment & Promotion",
    icon: navIcons.enrollment,
  },
  { id: "lifecycle", label: "Lifecycle", icon: navIcons.lifecycle },
  { id: "student-attendance", label: "Attendance", icon: navIcons.attendance },
  { id: "exams", label: "Examinations", icon: navIcons.exams },
  { id: "fees", label: "Fee Management", icon: navIcons.fees },
  { id: "collect-fee", label: "Collect Fee", icon: navIcons.fees },
  { id: "offline-sync", label: "Offline Sync", icon: navIcons.offline },
  { id: "messages", label: "Communication", icon: MessageSquareText },
]

/** Legacy section ids kept for deep links and redirects. */
const legacyManagementNav: { id: string; label: string; icon: Icon }[] = [
  { id: "academic", label: "Sessions", icon: navIcons.sessions },
  { id: "curriculum", label: "Lesson Plan", icon: navIcons.lessonPlan },
  { id: "lesson-review", label: "Lesson review", icon: navIcons.dailyTests },
  { id: "people", label: "Students", icon: navIcons.students },
  { id: "absences", label: "Substitutes", icon: navIcons.substitutes },
  { id: "weekly-tests", label: "Daily Test Schedule", icon: navIcons.dailyTests },
  { id: "results-gate", label: "Lifecycle", icon: navIcons.lifecycle },
]

export const navigation: Record<
  Role,
  { id: string; label: string; icon: Icon }[]
> = {
  super_admin: [
    { id: "dashboard", label: "Dashboard", icon: navIcons.dashboard },
    ...managementNav,
    { id: "finance", label: "Finance", icon: navIcons.finance },
    { id: "reports", label: "Reports", icon: navIcons.reports },
    { id: "settings", label: "Settings", icon: navIcons.settings },
    ...legacyManagementNav,
  ],
  operations_manager: [
    { id: "overview", label: "Overview", icon: navIcons.dashboard },
    ...managementNav.filter((item) =>
      !["fees", "collect-fee", "offline-sync", "finance"].includes(item.id)
    ),
    { id: "settings", label: "Settings", icon: navIcons.settings },
    { id: "reports", label: "Reports", icon: navIcons.reports },
    ...legacyManagementNav,
  ],
  accountant: [
    { id: "collect", label: "Record payment", icon: navIcons.fees },
    { id: "collections", label: "My daily receipts", icon: ReceiptText },
  ],
  teacher: [
    { id: "today", label: "Today", icon: navIcons.dashboard },
    { id: "classes", label: "My classes", icon: navIcons.classes },
    { id: "attendance", label: "Attendance", icon: navIcons.attendance },
    { id: "daily-update", label: "Daily update", icon: navIcons.lessonPlan },
    { id: "weekly-tests", label: "Weekly tests", icon: navIcons.dailyTests },
    { id: "notices", label: "Class notices", icon: MessageSquareText },
    { id: "marks", label: "Marks entry", icon: navIcons.exams },
  ],
  parent: [
    { id: "home", label: "My child", icon: navIcons.dashboard },
    { id: "attendance", label: "Attendance", icon: navIcons.attendance },
    { id: "results", label: "Results & DMC", icon: navIcons.students },
    { id: "tests", label: "Weekly tests", icon: navIcons.dailyTests },
    { id: "fees", label: "Fees & receipts", icon: navIcons.fees },
    { id: "timetable", label: "Timetable", icon: navIcons.timetable },
    { id: "updates", label: "Updates", icon: Bell },
  ],
}

export const sectionIds = Object.fromEntries(
  ALL_ROLES.map((role) => [
    role,
    new Set(navigation[role].map((item) => item.id)),
  ])
) as Record<Role, Set<string>>

export function navigationLabelForSection(section: string, role: Role) {
  const item = navigation[role].find((entry) => entry.id === section)
  if (item) return item.label
  if (section === "dashboard" && role === "super_admin") return "Dashboard"
  return section
}

export const subtitles: Record<string, string> = {
  dashboard: "A live view of people, learning, fees and school operations.",
  overview: "Today’s academic operations — cover, reviews, tests and results.",
  sessions: "Only one session can be marked as Current at a time.",
  subjects: "Subject catalog for the current session.",
  "teachers-assignments": "Portal users, teachers, and office staff.",
  substitutes: "Mark teacher absences and assign cover for affected periods.",
  timetable:
    "Periods, rooms and conflict-aware scheduling; parents see their child's weekly timetable here.",
  "lesson-plan": "Planned chapters for daily teacher updates.",
  "daily-test-schedule": "Weekly test calendar and publishing.",
  students: "Enrolled students and class registers.",
  "enrollment-promotion": "Enrollment steps and class promotion.",
  lifecycle: "Status changes, graduation, strike-off, readmission and their history.",
  "student-attendance": "School-wide attendance insight.",
  "collect-fee": "Record fee payments and print receipts.",
  "offline-sync": "Import fee workbooks and sync offline collections.",
  academic: "Sessions, subjects and a conflict-aware timetable.",
  classes: "Class sections for the current session — students, subjects, and status.",
  curriculum: "Plan the chapters teachers select in their daily updates.",
  "lesson-review": "Approve daily updates before parents can see them.",
  admissions: "Applications, enrollment and the student register.",
  people: "Teachers and office staff; one active subject per teacher.",
  absences: "Mark teachers absent by period and assign a free substitute.",
  "weekly-tests":
    "One test day per subject, marks, publishing and monthly outcomes.",
  exams: "Controlled marks, verification and publishing.",
  "results-gate":
    "Published results, the fee rule at view time and audited overrides.",
  fees: "Receipts, monthly fee status and offline synchronisation.",
  finance: "Income, expenses and the operating position.",
  messages: "Approve what families are allowed to see.",
  settings: "Configurable pass criteria and the result fee rule.",
  reports: "Printable insight and a traceable audit history.",
  collect: "Record a payment; it clears the oldest unpaid month first.",
  collections: "Only the receipts you recorded, day by day.",
  today: "Your timetable for today, including substitute duties.",
  attendance: "Mark and save attendance for an assigned class.",
  "daily-update": "Pick today’s planned chapter and send it for review.",
  notices: "Draft class notices for approval and parent visibility.",
  marks: "Enter draft marks, then submit the locked sheet.",
  home: "Everything important about your child, in one place.",
  results: "Published examinations and downloadable report cards.",
  tests: "Published weekly test marks and the monthly outcome.",
  updates: "Approved lesson updates and school notices.",
}
