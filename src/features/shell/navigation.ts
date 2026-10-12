import {
  Bell,
  BookOpen,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CloudUpload,
  CreditCard,
  FileCheck2,
  FolderOpen,
  GitBranch,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  MessageSquareText,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserRoundPlus,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react"
import { type ComponentType } from "react"

import { ALL_ROLES, type Role } from "@/lib/auth"

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
  { id: "sessions", label: "Sessions", icon: CalendarDays },
  { id: "classes", label: "Classes", icon: Layers },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  {
    id: "teachers-assignments",
    label: "Teachers & Assignments",
    icon: UserRound,
  },
  { id: "timetable", label: "Timetable", icon: CalendarClock },
  { id: "substitutes", label: "Substitutes", icon: RefreshCw },
  { id: "lesson-plan", label: "Lesson Plan", icon: ClipboardList },
  {
    id: "daily-test-schedule",
    label: "Daily Test Schedule",
    icon: ClipboardCheck,
  },
  { id: "admissions", label: "Admissions", icon: UserRoundPlus },
  { id: "students", label: "Students", icon: GraduationCap },
  {
    id: "enrollment-promotion",
    label: "Enrollment & Promotion",
    icon: GitBranch,
  },
  { id: "lifecycle", label: "Lifecycle", icon: Workflow },
  { id: "student-attendance", label: "Attendance", icon: UserCheck },
  { id: "exams", label: "Examinations", icon: FileCheck2 },
  { id: "fees", label: "Fee Management", icon: WalletCards },
  { id: "collect-fee", label: "Collect Fee", icon: CreditCard },
  { id: "offline-sync", label: "Offline Sync", icon: CloudUpload },
  { id: "messages", label: "Communication", icon: MessageSquareText },
]

/** Legacy section ids kept for deep links and redirects. */
const legacyManagementNav: { id: string; label: string; icon: Icon }[] = [
  { id: "academic", label: "Sessions", icon: CalendarDays },
  { id: "curriculum", label: "Lesson Plan", icon: ClipboardList },
  { id: "lesson-review", label: "Lesson review", icon: ClipboardCheck },
  { id: "people", label: "Students", icon: GraduationCap },
  { id: "absences", label: "Substitutes", icon: RefreshCw },
  { id: "weekly-tests", label: "Daily Test Schedule", icon: ClipboardCheck },
  { id: "results-gate", label: "Lifecycle", icon: Workflow },
]

export const navigation: Record<
  Role,
  { id: string; label: string; icon: Icon }[]
> = {
  super_admin: [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    ...managementNav,
    { id: "finance", label: "Finance", icon: Landmark },
    { id: "reports", label: "Reports", icon: FolderOpen },
    { id: "settings", label: "Settings", icon: Settings2 },
    ...legacyManagementNav,
  ],
  operations_manager: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    ...managementNav.filter((item) =>
      !["fees", "collect-fee", "offline-sync", "finance"].includes(item.id)
    ),
    { id: "settings", label: "Settings", icon: Settings2 },
    { id: "reports", label: "Reports", icon: FolderOpen },
    ...legacyManagementNav,
  ],
  accountant: [
    { id: "collect", label: "Record payment", icon: WalletCards },
    { id: "collections", label: "My daily receipts", icon: ReceiptText },
  ],
  teacher: [
    { id: "today", label: "Today", icon: LayoutDashboard },
    { id: "classes", label: "My classes", icon: Users },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "daily-update", label: "Daily update", icon: BookOpen },
    { id: "weekly-tests", label: "Weekly tests", icon: ClipboardList },
    { id: "notices", label: "Class notices", icon: MessageSquareText },
    { id: "marks", label: "Marks entry", icon: FileCheck2 },
  ],
  parent: [
    { id: "home", label: "My child", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "results", label: "Results & DMC", icon: GraduationCap },
    { id: "tests", label: "Weekly tests", icon: ClipboardList },
    { id: "fees", label: "Fees & receipts", icon: WalletCards },
    { id: "timetable", label: "Timetable", icon: CalendarDays },
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
  sessions: "Academic years, activation and session-scoped setup.",
  subjects: "Subject catalog for the current session.",
  "teachers-assignments": "Teachers, subjects and class assignments.",
  timetable: "Periods, rooms and conflict-aware scheduling.",
  substitutes: "Mark absences and assign cover teachers.",
  "lesson-plan": "Planned chapters for daily teacher updates.",
  "daily-test-schedule": "Weekly test calendar and publishing.",
  students: "Enrolled students and class registers.",
  "enrollment-promotion": "Enrollment steps and class promotion.",
  lifecycle: "Student lifecycle and result visibility rules.",
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
  timetable: "The weekly timetable for the selected child.",
  updates: "Approved lesson updates and school notices.",
}
