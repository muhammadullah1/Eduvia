export const PERIOD_DURATION_MINUTES = 45

/** Default start time for a 1-based period (45-minute blocks from 08:00). */
export function defaultStartTimeForPeriod(periodIndex: number) {
  const startMinutes = 8 * 60
  const total = startMinutes + (Math.max(periodIndex, 1) - 1) * 45
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export type PeriodTimeMap = Record<number, string>

export function defaultPeriodTimeMap(periodCount: number): PeriodTimeMap {
  const map: PeriodTimeMap = {}
  for (let period = 1; period <= periodCount; period += 1) {
    map[period] = defaultStartTimeForPeriod(period)
  }
  return map
}

export function periodTimesFromApi(
  raw: Record<string, string> | null | undefined,
  periodCount: number
): PeriodTimeMap {
  const base = defaultPeriodTimeMap(periodCount)
  if (!raw) return base
  for (let period = 1; period <= periodCount; period += 1) {
    const value = raw[String(period)]
    if (value && isValidTime(value)) base[period] = value
  }
  return base
}

export function serializePeriodTimes(map: PeriodTimeMap): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(map)) {
    if (isValidTime(value)) out[String(key)] = value.trim()
  }
  return out
}

export function timeForPeriod(map: PeriodTimeMap, periodIndex: number) {
  const value = map[periodIndex]?.trim()
  if (value && isValidTime(value)) return value
  return defaultStartTimeForPeriod(periodIndex)
}

export function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value.trim())
}

export function endTimeFromStart(
  start: string,
  durationMinutes = PERIOD_DURATION_MINUTES
) {
  if (!isValidTime(start)) return start
  const [h, m] = start.split(":").map(Number)
  const total = h * 60 + m + durationMinutes
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
}

export function periodTimeRangeLabel(
  start: string,
  durationMinutes = PERIOD_DURATION_MINUTES
) {
  if (!isValidTime(start)) return "Set time"
  return `${start}–${endTimeFromStart(start, durationMinutes)}`
}

export const WEEKDAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
}
