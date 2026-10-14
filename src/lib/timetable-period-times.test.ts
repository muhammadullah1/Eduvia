import { describe, expect, it } from "vitest"

import {
  defaultPeriodTimeMap,
  periodTimesFromApi,
  serializePeriodTimes,
} from "@/lib/timetable-period-times"

describe("timetable-period-times", () => {
  it("merges API period start times with defaults", () => {
    const map = periodTimesFromApi({ "1": "09:15", "3": "10:45" }, 4)
    expect(map[1]).toBe("09:15")
    expect(map[2]).toBe("08:45")
    expect(map[3]).toBe("10:45")
    expect(map[4]).toBe("10:15")
  })

  it("serializes valid period keys for PATCH body", () => {
    const serialized = serializePeriodTimes({ 1: "08:00", 2: "invalid", 3: "09:30" })
    expect(serialized).toEqual({ "1": "08:00", "3": "09:30" })
  })

  it("builds defaults for period count", () => {
    const map = defaultPeriodTimeMap(2)
    expect(Object.keys(map)).toHaveLength(2)
    expect(map[1]).toMatch(/^\d{2}:\d{2}$/)
  })
})
