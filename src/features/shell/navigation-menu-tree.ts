import { Archive, CalendarOff, DoorOpen, Shield } from "lucide-react"
import type { ComponentType } from "react"

import type { Role } from "@/lib/auth"

import { navIcons } from "./nav-icons"
import { navigation } from "./navigation"

export type NavLink = {
  type: "link"
  id: string
  panel?: string
  label?: string
  icon?: ComponentType<{ className?: string }>
}

export type NavFolder = {
  type: "folder"
  key: string
  label: string
  defaultOpen?: boolean
  children: NavLink[]
}

export type NavNode = NavLink | NavFolder

const ACADEMIC_FOLDER: NavFolder = {
  type: "folder",
  key: "academic",
  label: "Academic Management",
  defaultOpen: true,
  children: [
    { type: "link", id: "sessions" },
    { type: "link", id: "classes" },
    { type: "link", id: "subjects" },
    { type: "link", id: "teachers-assignments" },
    { type: "link", id: "timetable" },
    { type: "link", id: "substitutes" },
    { type: "link", id: "lesson-plan" },
    { type: "link", id: "daily-test-schedule" },
    { type: "link", id: "exams" },
  ],
}

const STUDENT_FOLDER: NavFolder = {
  type: "folder",
  key: "students",
  label: "Student Management",
  defaultOpen: true,
  children: [
    { type: "link", id: "admissions" },
    { type: "link", id: "students" },
    { type: "link", id: "enrollment-promotion" },
    { type: "link", id: "lifecycle" },
    { type: "link", id: "student-attendance" },
  ],
}

const FINANCE_FOLDER: NavFolder = {
  type: "folder",
  key: "finance",
  label: "Finance",
  defaultOpen: true,
  children: [
    { type: "link", id: "fees" },
    { type: "link", id: "collect-fee" },
    { type: "link", id: "offline-sync" },
    { type: "link", id: "finance" },
  ],
}

const SETTINGS_FOLDER: NavFolder = {
  type: "folder",
  key: "settings",
  label: "Settings",
  defaultOpen: false,
  children: [
    {
      type: "link",
      id: "settings",
      label: "General & Rules",
      icon: navIcons.settings,
    },
    {
      type: "link",
      id: "settings",
      panel: "calendar",
      label: "Calendar & Holidays",
      icon: CalendarOff,
    },
    {
      type: "link",
      id: "settings",
      panel: "rooms",
      label: "Rooms & Locations",
      icon: DoorOpen,
    },
    {
      type: "link",
      id: "settings",
      panel: "archives",
      label: "Archives",
      icon: Archive,
    },
    {
      type: "link",
      id: "settings",
      panel: "roles",
      label: "Roles & Permissions",
      icon: Shield,
    },
  ],
}

const SUPER_ADMIN_TREE: NavNode[] = [
  { type: "link", id: "dashboard" },
  ACADEMIC_FOLDER,
  STUDENT_FOLDER,
  FINANCE_FOLDER,
  { type: "link", id: "reports" },
  SETTINGS_FOLDER,
]

const OPERATIONS_TREE: NavNode[] = [
  { type: "link", id: "overview" },
  ACADEMIC_FOLDER,
  STUDENT_FOLDER,
  { type: "link", id: "audit-log" },
  SETTINGS_FOLDER,
]

/** The accountant's simple sidebar: only the sections they are allowed to use. */
const ACCOUNTANT_TREE: NavNode[] = [
  { type: "link", id: "collect" },
  { type: "link", id: "collections" },
  { type: "link", id: "fee-structure" },
  { type: "link", id: "fee-generation" },
  { type: "link", id: "expenses" },
  { type: "link", id: "offline-sync" },
]

const TEACHER_TREE: NavNode[] = [
  { type: "link", id: "today" },
  {
    type: "folder",
    key: "teaching",
    label: "My teaching",
    defaultOpen: true,
    children: [
      { type: "link", id: "classes" },
      { type: "link", id: "attendance" },
      { type: "link", id: "daily-update" },
      { type: "link", id: "weekly-tests" },
      { type: "link", id: "notices" },
      { type: "link", id: "marks" },
    ],
  },
]

const PARENT_TREE: NavNode[] = [
  { type: "link", id: "home" },
  {
    type: "folder",
    key: "child",
    label: "My child",
    defaultOpen: true,
    children: [
      { type: "link", id: "attendance" },
      { type: "link", id: "results" },
      { type: "link", id: "tests" },
      { type: "link", id: "fees" },
      { type: "link", id: "timetable" },
      { type: "link", id: "updates" },
    ],
  },
]

const TREE_BY_ROLE: Partial<Record<Role, NavNode[]>> = {
  super_admin: SUPER_ADMIN_TREE,
  operations_manager: OPERATIONS_TREE,
  accountant: ACCOUNTANT_TREE,
  teacher: TEACHER_TREE,
  parent: PARENT_TREE,
}

function filterTree(nodes: NavNode[], allowed: Set<string>): NavNode[] {
  const out: NavNode[] = []
  for (const node of nodes) {
    if (node.type === "link") {
      if (allowed.has(node.id)) out.push(node)
      continue
    }
    const children = node.children.filter((child) => allowed.has(child.id))
    if (children.length > 0) {
      out.push({ ...node, children })
    }
  }
  return out
}

export function folderContainsSection(
  folder: NavFolder,
  sectionId: string
): boolean {
  return folder.children.some((child) => child.id === sectionId)
}

export function treeContainsSection(nodes: NavNode[], sectionId: string): boolean {
  for (const node of nodes) {
    if (node.type === "link") {
      if (node.id === sectionId) return true
    } else if (folderContainsSection(node, sectionId)) {
      return true
    }
  }
  return false
}

export function navigationMenuTreeForRole(role: Role): NavNode[] {
  const allowed = new Set(navigation[role].map((item) => item.id))
  const tree = TREE_BY_ROLE[role] ?? [
    ...navigation[role].map((item) => ({ type: "link" as const, id: item.id })),
  ]
  return filterTree(tree, allowed)
}
