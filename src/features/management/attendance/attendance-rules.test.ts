import { describe, expect, it } from "vitest"

import { editWindowText, guardianLine, monthLabel, percentLabel, percentTone, validateEdit } from "./attendance-rules"

describe("attendance review rules", () => {
  it("requires a different status and a reason", () => {
    expect(validateEdit({ status: "", reason: "" }, "Absent")).toEqual({ status: "Choose a status.", reason: "Give a reason of at least 3 characters." })
    expect(validateEdit({ status: "Absent", reason: "late bus" }, "Absent").status).toMatch(/Already marked absent/)
    expect(validateEdit({ status: "Late", reason: "  ok " }, "Absent").reason).toBeDefined()
    expect(validateEdit({ status: "Late", reason: "Bus was late" }, "Absent")).toEqual({})
  })
  it("formats percentages and tones against the threshold", () => {
    expect(percentLabel(null)).toBe("—")
    expect(percentLabel(80)).toBe("80%")
    expect(percentLabel(66.666)).toBe("66.7%")
    expect(percentTone(null, 75)).toBe("none")
    expect(percentTone(74.9, 75)).toBe("danger")
    expect(percentTone(75, 75)).toBe("warning")
    expect(percentTone(85, 75)).toBe("good")
  })
  it("describes guardians, months and the edit window", () => {
    expect(guardianLine(null)).toBe("No guardian on file")
    expect(guardianLine({ name: "Aslam", relation: "Father", phone: "0300" })).toBe("Aslam (Father) · 0300")
    expect(guardianLine({ name: null, relation: null, phone: null })).toBe("No guardian on file")
    expect(monthLabel("2026-09")).toBe("September 2026")
    expect(editWindowText(0)).toBe("on the same day")
    expect(editWindowText(1)).toBe("within 1 day of the attendance date")
    expect(editWindowText(7)).toBe("within 7 days of the attendance date")
  })
})

describe("shared attendance percentage", async () => {
  const { attendancePercent } = await import("@/data/types")
  it("leaves Leave and Excused out of the denominator and never divides by zero", () => {
    expect(attendancePercent(["Present", "Late", "Absent", "Leave", "Leave"])).toBe(66.7)
    expect(attendancePercent(["Present", "Excused"])).toBe(100)
    expect(attendancePercent(["Leave", "Leave"])).toBeNull()
    expect(attendancePercent([])).toBeNull()
    expect(attendancePercent(["Present", "Absent", "Absent"], 0)).toBe(33)
  })
})
