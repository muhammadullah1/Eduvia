import { SESSION_TODAY } from "@/data/session"

export function formatPkr(amount: number) {
  return `₨ ${Math.round(amount).toLocaleString("en-PK")}`
}

export function formatPkrCompact(amount: number) {
  const sign = amount < 0 ? "−" : ""
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${sign}₨ ${(abs / 1_000_000).toFixed(2)}m`
  return `${sign}${formatPkr(abs)}`
}

export function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

export function formatLongDate(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function formatSchoolDay(iso = SESSION_TODAY) {
  const date = new Date(`${iso}T12:00:00Z`)
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
}

export function formatWhen(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return formatLongDate(iso)
}

export function letterGrade(percent: number) {
  if (percent >= 90) return "A+"
  if (percent >= 80) return "A"
  if (percent >= 70) return "B"
  if (percent >= 60) return "C"
  if (percent >= 50) return "D"
  return "F"
}

export function downloadText(
  filename: string,
  content: string,
  mime = "text/plain"
) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function matchesQuery(
  query: string,
  parts: Array<string | number | null | undefined>
) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return parts.some((part) =>
    String(part ?? "")
      .toLowerCase()
      .includes(needle)
  )
}

export function weekday(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay()
}

export function isWeekend(iso: string) {
  const day = weekday(iso)
  return day === 0 || day === 6
}
