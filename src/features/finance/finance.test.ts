import { describe, expect, it } from "vitest"

import { type EntryValues,validateEntry } from "./entry"
import { fyLabel, fyStartYear, periodOptions, quarterLabel } from "./periods"

describe("finance periods (FY Apr–Mar)", () => {
  it("puts Jan–Mar in the previous financial year", () => {
    expect(fyStartYear("2026-03")).toBe(2025)
    expect(fyStartYear("2026-04")).toBe(2026)
    expect(fyLabel(2026)).toBe("FY 2026-27 (Apr 2026 – Mar 2027)")
    expect(quarterLabel(2026, 4)).toBe("Q4 2026-27 (Jan–Mar 2027)")
  })

  it("offers 18 months, quarters up to the current one and 3 FYs", () => {
    const { months, quarters, years } = periodOptions("2026-10-25")
    expect(months).toHaveLength(18)
    expect(months[0]).toEqual({ value: "2026-10", label: "October 2026" })
    expect(months[17].value).toBe("2025-05")
    expect(quarters.map((q) => q.value)).toEqual(["2026-Q3", "2026-Q2", "2026-Q1", "2025-Q4", "2025-Q3", "2025-Q2", "2025-Q1"])
    expect(years.map((y) => y.value)).toEqual(["FY2026", "FY2025", "FY2024"])
    expect(periodOptions("2026-01-10").quarters[0].value).toBe("2025-Q4")
    expect(periodOptions("2026-04-01").quarters[0].value).toBe("2026-Q1")
  })
})

describe("validateEntry", () => {
  const ok: EntryValues = { category: "Utilities", amount: "1200.50", date: "2026-10-20", description: "Electricity", referenceNo: "", paymentMethod: "" }
  it("accepts a valid entry", () => expect(validateEntry(ok, "2026-10-25")).toEqual({}))
  it("rejects bad amounts, future dates and empty fields", () => {
    expect(validateEntry({ ...ok, amount: "0" }, "2026-10-25").amount).toBeTruthy()
    expect(validateEntry({ ...ok, amount: "1.234" }, "2026-10-25").amount).toBeTruthy()
    expect(validateEntry({ ...ok, amount: "99999999999" }, "2026-10-25").amount).toBeTruthy()
    expect(validateEntry({ ...ok, date: "2026-10-26" }, "2026-10-25").date).toBeTruthy()
    expect(Object.keys(validateEntry({ ...ok, category: "", amount: "", date: "", description: " " }, "2026-10-25")).sort()).toEqual(["amount", "category", "date", "description"])
  })
})
