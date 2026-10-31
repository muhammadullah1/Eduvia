import { Archive, CalendarOff, DoorOpen } from "lucide-react"
import type { ComponentType } from "react"

import type { PortalSlug } from "@/lib/auth"

import { navIcons } from "./nav-icons"
import type { NavItem } from "./navigation"

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
    { type: "link", id: "collections" },
    { type: "link", id: "fee-structure" },
    { type: "link", id: "fee-generation" },
    { type: "link", id: "fee-concessions" },
    { type: "link", id: "expenses" },
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
      label: "Rules & Config",
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
    { type: "link", id: "roles" },
  ],
}

const STAFF_TREE: NavNode[] = [
  { type: "link", id: "dashboard" },
  ACADEMIC_FOLDER,
  STUDENT_FOLDER,
  FINANCE_FOLDER,
  { type: "link", id: "reports" },
  { type: "link", id: "audit-log" },
  SETTINGS_FOLDER,
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

const TREE_BY_PORTAL: Record<PortalSlug, NavNode[]> = {
  admin: STAFF_TREE,
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

/** The sidebar tree for a portal, keeping only the sections in `allowed`. */
export function navigationMenuTree(portal: PortalSlug, allowed: readonly NavItem[]): NavNode[] {
  return filterTree(TREE_BY_PORTAL[portal], new Set(allowed.map((item) => item.id)))
}
