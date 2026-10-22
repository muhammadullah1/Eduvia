/** `YYYY-MM-DD` for a Date in the browser's own timezone. Never use toISOString() for this. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getToday(): string {
  return toIsoDate(new Date())
}
