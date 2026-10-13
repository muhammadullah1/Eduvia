export const CLASS_DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "subjects", label: "Subjects" },
  { id: "students", label: "Students" },
  { id: "fee-structure", label: "Fee Structure" },
  { id: "timetable", label: "Timetable" },
] as const

export type ClassDetailTabId = (typeof CLASS_DETAIL_TABS)[number]["id"]

export function parseClassDetailTab(value?: string): ClassDetailTabId {
  const found = CLASS_DETAIL_TABS.find((tab) => tab.id === value)
  return found?.id ?? "overview"
}
