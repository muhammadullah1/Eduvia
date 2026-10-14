export const CLASS_DETAIL_TABS = [
  { id: "students", label: "Students" },
  { id: "timetable", label: "Timetable" },
  { id: "subjects", label: "Subjects" },
] as const

export type ClassDetailTabId = (typeof CLASS_DETAIL_TABS)[number]["id"]

export const DEFAULT_CLASS_DETAIL_TAB: ClassDetailTabId = "students"

const LEGACY_TAB_ALIASES: Record<string, ClassDetailTabId> = {
  overview: DEFAULT_CLASS_DETAIL_TAB,
  "fee-structure": DEFAULT_CLASS_DETAIL_TAB,
}

export function parseClassDetailTab(value?: string): ClassDetailTabId {
  if (value && value in LEGACY_TAB_ALIASES) {
    return LEGACY_TAB_ALIASES[value]
  }
  const found = CLASS_DETAIL_TABS.find((tab) => tab.id === value)
  return found?.id ?? DEFAULT_CLASS_DETAIL_TAB
}
