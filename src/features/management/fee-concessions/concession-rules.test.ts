import { describe, expect, it } from "vitest"

import { valueError, valueText } from "./concession-rules"

describe("concession value rules (match the API)", () => {
  it("rejects a zero or over-100 percent", () => {
    expect(valueError("percent", "0")).toMatch(/more than 0/)
    expect(valueError("percent", "101")).toMatch(/at most 100/)
    expect(valueError("percent", "25")).toBeNull()
  })

  it("allows a zero fixed payable but not a zero discount", () => {
    expect(valueError("fixed_payable", "0")).toBeNull()
    expect(valueError("fixed_payable", "-1")).toMatch(/negative/)
    expect(valueError("fixed_discount", "0")).toMatch(/more than 0/)
    expect(valueError("fixed_discount", "")).toMatch(/number/)
    expect(valueError("waiver", "")).toBeNull()
  })

  it("describes each mode in plain words", () => {
    expect(valueText({ mode: "fixed_payable", value: 3000 })).toMatch(/^pays PKR/)
    expect(valueText({ mode: "waiver", value: 0 })).toBe("full waiver")
    expect(valueText({ mode: "percent", value: 10 })).toMatch(/%$/)
  })
})
