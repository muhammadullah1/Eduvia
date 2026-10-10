import {
  Bell,
  BookOpen,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LibraryBig,
  MessageSquareText,
  ReceiptText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  WalletCards,
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
  { id: "academic", label: "Academic setup", icon: LibraryBig },
  { id: "curriculum", label: "Planned chapters", icon: BookOpen },
  { id: "lesson-review", label: "Lesson review", icon: ClipboardCheck },
  { id: "admissions", label: "Admissions", icon: Users },
  { id: "people", label: "People", icon: UserRound },
  { id: "absences", label: "Absences & cover", icon: CalendarClock },
  { id: "weekly-tests", label: "Weekly tests", icon: ClipboardList },
  { id: "exams", label: "Examinations", icon: FileCheck2 },
  { id: "results-gate", label: "Result visibility", icon: ShieldAlert },
  { id: "messages", label: "Communication", icon: MessageSquareText },
]

export const navigation: Record<
  Role,
  { id: string; label: string; icon: Icon }[]
> = {
  super_admin: [
    { id: "dashboard", label: "Command center", icon: LayoutDashboard },
    ...managementNav,
    { id: "fees", label: "Fees & sync", icon: WalletCards },
    { id: "finance", label: "Finance", icon: Landmark },
    { id: "settings", label: "Settings", icon: Settings2 },
    { id: "reports", label: "Reports & audit", icon: ClipboardCheck },
  ],
  operations_manager: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    ...managementNav,
    { id: "settings", label: "Academic rules", icon: Settings2 },
    { id: "reports", label: "Reports & audit", icon: ClipboardCheck },
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

export const subtitles: Record<string, string> = {
  dashboard: "A live view of people, learning, fees and school operations.",
  overview: "Today’s academic operations — cover, reviews, tests and results.",
  academic: "Sessions, classes, subjects and a conflict-aware timetable.",
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
  classes: "Only the classes allocated to your profile.",
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
