import { describe, expect, it } from "vitest"

import { getToday } from "@/lib/dates"

describe("getToday", () => {
  it("returns current local calendar date in YYYY-MM-DD format", () => {
    const today = getToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const now = new Date()
    const expectedYear = String(now.getFullYear())
    const expectedMonth = String(now.getMonth() + 1).padStart(2, "0")
    const expectedDay = String(now.getDate()).padStart(2, "0")

    expect(today).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`)
  })
})
