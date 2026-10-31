import { describe, expect, it } from "vitest"

import { gradeForPercent, gradingError } from "./grading"

const BANDS = [
  { min: 50, grade: "B" },
  { min: 80, grade: "A" },
  { min: 0, grade: "C" },
]

describe("gradeForPercent", () => {
  it("picks the highest band the percent meets, whatever the input order", () => {
    expect(gradeForPercent(85, true, BANDS)).toBe("A")
    expect(gradeForPercent(50, true, BANDS)).toBe("B")
    expect(gradeForPercent(10, true, BANDS)).toBe("C")
  })

  it("always shows F for a failed paper", () => {
    expect(gradeForPercent(95, false, BANDS)).toBe("F")
  })
})

describe("gradingError", () => {
  it("accepts a valid scale", () => {
    expect(gradingError(BANDS)).toBeNull()
  })

  it("rejects the reserved F, duplicates, gaps at 0 and bad sizes", () => {
    expect(gradingError([{ min: 0, grade: "F" }, { min: 50, grade: "A" }])).toMatch(/reserved/)
    expect(gradingError([{ min: 0, grade: "A" }, { min: 50, grade: "a" }])).toMatch(/twice/)
    expect(gradingError([{ min: 0, grade: "A" }, { min: 0, grade: "B" }])).toMatch(/start at 0%/)
    expect(gradingError([{ min: 10, grade: "A" }, { min: 50, grade: "B" }])).toMatch(/must start at 0%/)
    expect(gradingError([{ min: 0, grade: "A" }])).toMatch(/between/)
    expect(gradingError([{ min: 0, grade: "A" }, { min: 101, grade: "B" }])).toMatch(/whole numbers/)
  })
})
