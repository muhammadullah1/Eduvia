/**
 * Report periods, same keys as the API (utils/finance_period.js): a month
 * "2026-09", an FY quarter "2026-Q2" (Q1 Apr-Jun ... Q4 Jan-Mar of the next
 * year) or a financial year "FY2026" (Apr 2026 - Mar 2027).
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export type PeriodOption = { value: string; label: string }

export const fyStartYear = (month: string) => {
  const [y, m] = month.split("-").map(Number)
  return m >= 4 ? y : y - 1
}

export function monthName(month: string, long = false) {
  const [y, m] = month.split("-").map(Number)
  return `${(long ? LONG : MONTHS)[m - 1]} ${y}`
}

export function quarterLabel(fy: number, q: number) {
  const startMonth = 3 + (q - 1) * 3 // 0-based month index: Apr=3
  const first = new Date(Date.UTC(fy, startMonth, 1))
  const last = new Date(Date.UTC(fy, startMonth + 2, 1))
  const fmt = (d: Date) => MONTHS[d.getUTCMonth()]
  return `Q${q} ${fy}-${String(fy + 1).slice(2)} (${fmt(first)}–${fmt(last)} ${last.getUTCFullYear()})`
}

export const fyLabel = (fy: number) => `FY ${fy}-${String(fy + 1).slice(2)} (Apr ${fy} – Mar ${fy + 1})`

/** Picker groups: the last 18 months, the FY quarters up to now, the last 3 FYs. */
export function periodOptions(today: string) {
  const current = today.slice(0, 7)
  const months: PeriodOption[] = []
  let [y, m] = current.split("-").map(Number)
  for (let i = 0; i < 18; i += 1) {
    const key = `${y}-${String(m).padStart(2, "0")}`
    months.push({ value: key, label: monthName(key, true) })
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
  }
  const fy = fyStartYear(current)
  const currentQ = Math.floor(((Number(current.slice(5, 7)) + 8) % 12) / 3) + 1
  const quarters: PeriodOption[] = []
  for (let year = fy; year >= fy - 1; year -= 1) {
    for (let q = year === fy ? currentQ : 4; q >= 1; q -= 1) quarters.push({ value: `${year}-Q${q}`, label: quarterLabel(year, q) })
  }
  const years: PeriodOption[] = [0, 1, 2].map((i) => ({ value: `FY${fy - i}`, label: fyLabel(fy - i) }))
  return { months, quarters, years }
}
