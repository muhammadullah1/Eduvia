export const STAFF_DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "subject", label: "Subject" },
  { id: "assignments", label: "Class assignments" },
] as const

export type StaffDetailTabId = (typeof STAFF_DETAIL_TABS)[number]["id"]

export const DEFAULT_STAFF_DETAIL_TAB: StaffDetailTabId = "overview"

export function parseStaffDetailTab(value?: string): StaffDetailTabId {
  const found = STAFF_DETAIL_TABS.find((tab) => tab.id === value)
  if (found) return found.id
  return DEFAULT_STAFF_DETAIL_TAB
}

export function staffDetailTabsForRole(role: string): StaffDetailTabId[] {
  if (role === "teacher") {
    return ["overview", "subject", "assignments"] as StaffDetailTabId[]
  }
  return ["overview"] as StaffDetailTabId[]
}

export function defaultStaffDetailTabForRole(role: string): StaffDetailTabId {
  if (role === "teacher") return "subject"
  return "overview"
}
