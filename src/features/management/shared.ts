import type { ChartConfig } from "@/components/ui/chart"
import { getToday } from "@/lib/dates"

export const chartConfig = {
  students: { label: "Students", color: "var(--chart-1)" },
  collection: { label: "Collected", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-3)" },
} satisfies ChartConfig

export function monthsThroughToday(start: string) {
  const keys: string[] = []
  let cursor = start.slice(0, 7)
  const end = getToday().slice(0, 7)
  while (cursor <= end && keys.length < 12) {
    keys.push(cursor)
    const [year, month] = cursor.split("-").map(Number)
    cursor =
      month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, "0")}`
  }
  return keys
}

export function queryMatch(query: string, parts: Array<string | number>) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return parts.join(" ").toLowerCase().includes(needle)
}
