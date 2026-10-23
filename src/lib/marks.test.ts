import { describe, expect, it } from "vitest"

import { marksInput, paperTotalError } from "@/lib/marks"

describe("marksInput", () => {
  it("drops anything that is not a number", () => {
    expect(marksInput("4a5")).toBe("45")
    expect(marksInput("-12")).toBe("12")
    expect(marksInput("1e3")).toBe("13")
  })
  it("keeps one decimal point with two places", () => {
    expect(marksInput("12.555")).toBe("12.55")
    expect(marksInput("1.2.3")).toBe("1.23")
    expect(marksInput("12.5", { decimals: false })).toBe("125")
  })
})

describe("paperTotalError", () => {
  it("accepts whole numbers from 1 to 1000", () => {
    expect(paperTotalError("1")).toBeNull()
    expect(paperTotalError("1000")).toBeNull()
  })
  it("rejects empty, zero, decimals and anything above 1000", () => {
    expect(paperTotalError("")).toMatch(/Enter/)
    expect(paperTotalError("0")).toMatch(/between 1 and 1000/)
    expect(paperTotalError("1001")).toMatch(/between 1 and 1000/)
    expect(paperTotalError("50.5")).toMatch(/whole number/)
  })
})
