import {
  BadgePercent,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  CalendarRange,
  Layers,
  MessageSquareText,
  Receipt,
  ReceiptText,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { type ComponentType } from "react"

import type { Can, PermissionKey } from "@/lib/access"
import type { PortalSlug, Role } from "@/lib/auth"

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

export type NavItem = {
  id: string
  label: string
  icon: Icon
  /** Shown when the signed-in role holds any one of these permissions. */
  requires: readonly PermissionKey[]
  /** Hidden when the role holds this permission: a richer section already covers it. */
  hiddenWith?: PermissionKey
}

/** The single staff portal (/admin): what each role sees follows from its permissions. */
const STAFF_SECTIONS: readonly NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: navIcons.dashboard, requires: ["reports.dashboard", "fees.collections.mine"] },
  { id: "sessions", label: "Sessions", icon: navIcons.sessions, requires: ["academic.manage"] },
  { id: "classes", label: "Classes", icon: navIcons.classes, requires: ["academic.manage"] },
  { id: "subjects", label: "Subjects", icon: navIcons.subjects, requires: ["academic.manage"] },
  { id: "teachers-assignments", label: "Staff", icon: navIcons.staff, requires: ["users.read"] },
  { id: "timetable", label: "Timetable", icon: navIcons.timetable, requires: ["timetable.manage"] },
  { id: "substitutes", label: "Substitutes", icon: navIcons.substitutes, requires: ["absences.manage"] },
  { id: "lesson-plan", label: "Lesson Plan", icon: navIcons.lessonPlan, requires: ["chapters.manage"] },
  {
    id: "daily-test-schedule",
    label: "Daily Test Schedule",
    icon: navIcons.dailyTests,
    requires: ["tests.schedule"],
  },
  { id: "exams", label: "Examinations", icon: navIcons.exams, requires: ["exams.create"] },
  { id: "admissions", label: "Admissions", icon: navIcons.admissions, requires: ["admissions.manage"] },
  { id: "students", label: "Students", icon: navIcons.students, requires: ["students.manage"] },
  {
    id: "enrollment-promotion",
    label: "Enrollment & Promotion",
    icon: navIcons.enrollment,
    requires: ["students.manage"],
  },
  { id: "lifecycle", label: "Lifecycle", icon: navIcons.lifecycle, requires: ["students.manage"] },
  {
    id: "student-attendance",
    label: "Attendance",
    icon: navIcons.attendance,
    requires: ["attendance.review"],
  },
  { id: "fees", label: "Fee Management", icon: navIcons.fees, requires: ["fees.totals"] },
  { id: "collect-fee", label: "Collect Fee", icon: navIcons.collectFee, requires: ["fees.payments.record"] },
  {
    id: "collections",
    label: "My daily receipts",
    icon: ReceiptText,
    requires: ["fees.collections.mine"],
  },
  {
    id: "fee-structure",
    label: "Fee structure",
    icon: Layers,
    requires: ["fees.structure.read"],
    hiddenWith: "fees.totals",
  },
  {
    id: "fee-generation",
    label: "Monthly generation",
    icon: CalendarRange,
    requires: ["fees.months.generate"],
    hiddenWith: "fees.totals",
  },
  {
    id: "fee-concessions",
    label: "Concessions",
    icon: BadgePercent,
    requires: ["fees.concessions.approve"],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Receipt,
    requires: ["expenses.create"],
    hiddenWith: "income.read",
  },
  { id: "offline-sync", label: "Offline Sync", icon: navIcons.offline, requires: ["fees.import"] },
  { id: "finance", label: "Finance", icon: navIcons.finance, requires: ["income.read"] },
  { id: "reports", label: "Reports", icon: navIcons.reports, requires: ["finance.reports", "students.manage"] },
  {
    id: "audit-log",
    label: "Audit log",
    icon: navIcons.reports,
    requires: ["audit.read"],
    hiddenWith: "students.manage",
  },
  { id: "settings", label: "Settings", icon: navIcons.settings, requires: ["settings.read"] },
  { id: "roles", label: "Roles & Permissions", icon: Shield, requires: ["roles.manage"] },
]

const TEACHER_SECTIONS: readonly NavItem[] = [
  { id: "today", label: "Today", icon: navIcons.dashboard, requires: ["timetable.read"] },
  { id: "classes", label: "My classes", icon: navIcons.classes, requires: ["academic.read"] },
  { id: "attendance", label: "Attendance", icon: navIcons.attendance, requires: ["attendance.mark"] },
  { id: "daily-update", label: "Daily update", icon: navIcons.lessonPlan, requires: ["lessons.write"] },
  { id: "weekly-tests", label: "Weekly tests", icon: navIcons.dailyTests, requires: ["tests.marks"] },
  { id: "notices", label: "Class notices", icon: MessageSquareText, requires: ["updates.write"] },
  { id: "marks", label: "Marks entry", icon: navIcons.exams, requires: ["exams.marks"] },
]

const PARENT_SECTIONS: readonly NavItem[] = [
  { id: "home", label: "My child", icon: navIcons.dashboard, requires: ["students.read"] },
  { id: "attendance", label: "Attendance", icon: navIcons.attendance, requires: ["attendance.read"] },
  { id: "results", label: "Results & DMC", icon: navIcons.students, requires: ["results.parent"] },
  { id: "tests", label: "Weekly tests", icon: navIcons.dailyTests, requires: ["tests.read"] },
  { id: "fees", label: "Fees & receipts", icon: navIcons.fees, requires: ["fees.months.read"] },
  { id: "timetable", label: "Timetable", icon: navIcons.timetable, requires: ["timetable.read"] },
  { id: "updates", label: "Updates", icon: Bell, requires: ["updates.read"] },
]

const SECTIONS_BY_PORTAL: Record<PortalSlug, readonly NavItem[]> = {
  admin: STAFF_SECTIONS,
  teacher: TEACHER_SECTIONS,
  parent: PARENT_SECTIONS,
}

/** Old staff section ids (and the earlier operations/accountant portals) mapped to today's sections. */
export const LEGACY_SECTIONS: Record<string, { section: string; query?: string; rest?: string }> = {
  overview: { section: "dashboard" },
  collect: { section: "collect-fee" },
  academic: { section: "sessions" },
  curriculum: { section: "lesson-plan" },
  people: { section: "students" },
  absences: { section: "substitutes" },
  "weekly-tests": { section: "daily-test-schedule" },
  "results-gate": { section: "exams", rest: "result-visibility" },
  "settings-academic": { section: "settings" },
  "settings-calendar": { section: "settings", query: "?panel=calendar" },
  "settings-rooms": { section: "settings", query: "?panel=rooms" },
  "settings-archives": { section: "settings", query: "?panel=archives" },
  "settings-roles": { section: "roles" },
}

export function sectionsForPortal(portal: PortalSlug): readonly NavItem[] {
  return SECTIONS_BY_PORTAL[portal]
}

export function isSectionAllowed(item: NavItem, can: Can) {
  if (item.hiddenWith && can(item.hiddenWith)) return false
  return item.requires.some((key) => can(key))
}

export function allowedSections(portal: PortalSlug, can: Can): NavItem[] {
  return sectionsForPortal(portal).filter((item) => isSectionAllowed(item, can))
}

export function findSection(portal: PortalSlug, id: string) {
  return sectionsForPortal(portal).find((item) => item.id === id)
}

export function navigationLabelForSection(section: string, portal: PortalSlug) {
  const item = findSection(portal, section)
  if (item) return item.label
  return section
}

export const subtitles: Record<string, string> = {
  dashboard: "A live view of people, learning, fees and school operations.",
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
  admissions: "Applications, enrollment and the student register.",
  people: "Teachers and office staff; one active subject per teacher.",
  absences: "Mark teachers absent by period and assign a free substitute.",
  "weekly-tests":
    "One test day per subject, marks, publishing and monthly outcomes.",
  exams: "Controlled marks, verification and publishing.",
  "results-gate":
    "Published results, the fee rule at view time and audited overrides.",
  fees: "Receipts, monthly fee status and offline synchronisation.",
  "fee-concessions": "Pending approvals and school concession reasons.",
  finance: "Income, expenses and the operating position.",
  settings: "Configure school-wide policies, assessment criteria, and admission numbering.",
  "settings-academic": "Academic structure, current session details, and catalog overview.",
  "settings-calendar": "School closures, holidays, and calendar black-out dates.",
  "settings-rooms": "School room directory, location codes, and room capacities.",
  "settings-archives": "Review and restore soft-deleted records across all categories.",
  roles: "Who can see and do what in each role; changes apply on the next request.",
  reports: "Printable insight and a traceable audit history.",
  "audit-log": "Sensitive actions recorded by the school system (read-only).",
  collections: "Only the receipts you recorded, day by day.",
  expenses: "Record school expenses; you see only the entries you recorded.",
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
