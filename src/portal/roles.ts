import type { ComponentType } from "react"
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LibraryBig,
  MessageSquareText,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react"

import type { Role } from "@/lib/auth"

type Icon = ComponentType<{ className?: string }>

export const roles: Record<
  Role,
  {
    label: string
    short: string
    description: string
    user: string
    initials: string
    icon: Icon
  }
> = {
  management: {
    label: "Management Portal",
    short: "Management",
    description: "Complete school operations and governance",
    user: "Ayesha Khan",
    initials: "AK",
    icon: Building2,
  },
  controller: {
    label: "Controller Portal",
    short: "Controller",
    description: "Management oversight and result controls",
    user: "Imran Shah",
    initials: "IS",
    icon: ShieldCheck,
  },
  accountant: {
    label: "Accountant Portal",
    short: "Accountant",
    description: "Fee portal focused on collections",
    user: "Nadia Iqbal",
    initials: "NI",
    icon: Calculator,
  },
  teacher: {
    label: "Teacher Portal",
    short: "Teacher",
    description: "Classes, attendance and academic delivery",
    user: "Hassan Ali",
    initials: "HA",
    icon: BookOpen,
  },
  parent: {
    label: "Parent Portal",
    short: "Parent",
    description: "A clear view of your child’s school journey",
    user: "Sara Ahmed",
    initials: "SA",
    icon: UserRound,
  },
}

export const navigation: Record<Role, { label: string; icon: Icon }[]> = {
  management: [
    { label: "Command center", icon: LayoutDashboard },
    { label: "Academic setup", icon: LibraryBig },
    { label: "Admissions", icon: Users },
    { label: "Examinations", icon: FileCheck2 },
    { label: "Monthly tests", icon: ClipboardList },
    { label: "Teacher absences", icon: CalendarClock },
    { label: "Result fee gate", icon: ShieldAlert },
    { label: "Fees & sync", icon: WalletCards },
    { label: "Finance", icon: Landmark },
    { label: "Reports & audit", icon: BarChart3 },
  ],
  controller: [
    { label: "Oversight", icon: LayoutDashboard },
    { label: "Monthly tests", icon: ClipboardList },
    { label: "Teacher absences", icon: CalendarClock },
    { label: "Result fee gate", icon: ShieldAlert },
    { label: "Fees oversight", icon: WalletCards },
  ],
  accountant: [
    { label: "Fee desk", icon: WalletCards },
    { label: "Finance", icon: Landmark },
    { label: "Collections report", icon: ReceiptText },
  ],
  teacher: [
    { label: "Today", icon: LayoutDashboard },
    { label: "My classes", icon: Users },
    { label: "Attendance", icon: UserCheck },
    { label: "Lesson / chapter", icon: BookOpen },
    { label: "Daily test results", icon: ClipboardList },
    { label: "Daily updates", icon: MessageSquareText },
    { label: "Marks entry", icon: FileCheck2 },
  ],
  parent: [
    { label: "My child", icon: LayoutDashboard },
    { label: "Attendance", icon: UserCheck },
    { label: "Results & DMC", icon: GraduationCap },
    { label: "Fees & receipts", icon: ReceiptText },
    { label: "Timetable", icon: CalendarDays },
    { label: "Updates", icon: Bell },
  ],
}
