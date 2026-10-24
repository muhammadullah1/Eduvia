import { describe, expect, it } from "vitest"

import type { LifecycleEvent } from "@/api/students/lifecycle.service"

import { lifecycleToCsv } from "./lifecycle-csv"
import {
  actionLabel,
  buildStatusBody,
  emptyHistoryFilters,
  emptyStatusForm,
  eventDetail,
  historyParams,
  isReadmission,
  type StatusContext,
  validateStatusForm,
} from "./lifecycle-rules"

const TODAY = "2026-10-23"
const ctx = (over: Partial<StatusContext> = {}): StatusContext => ({
  from: "Active",
  today: TODAY,
  admittedOn: "2026-04-01",
  finalGrade: true,
  ...over,
})
const form = (over: Partial<ReturnType<typeof emptyStatusForm>> = {}) => ({
  ...emptyStatusForm(TODAY),
  reason: "Parent request",
  ...over,
})

describe("validateStatusForm", () => {
  it("requires a target status and a reason", () => {
    expect(validateStatusForm(emptyStatusForm(TODAY), ctx())).toMatch(/Choose what happens/)
    expect(validateStatusForm(form({ to: "Inactive", reasonCategory: "Medical", reason: " " }), ctx())).toMatch(/reason/)
  })

  it("allows past dates but not future dates or dates before admission (D1)", () => {
    const base = { to: "Inactive" as const, reasonCategory: "Medical" }
    expect(validateStatusForm(form({ ...base, effectiveOn: "2026-05-01" }), ctx())).toBeNull()
    expect(validateStatusForm(form({ ...base, effectiveOn: "2026-10-24" }), ctx())).toMatch(/future/)
    expect(validateStatusForm(form({ ...base, effectiveOn: "2026-03-31" }), ctx())).toMatch(/before admission/)
  })

  it("needs a category for Inactive and Struck off, and the academic status for Struck off (D8)", () => {
    expect(validateStatusForm(form({ to: "Inactive" }), ctx())).toMatch(/category/)
    expect(validateStatusForm(form({ to: "StruckOff", reasonCategory: "Transfer out" }), ctx())).toMatch(/academic status/)
    expect(
      validateStatusForm(form({ to: "StruckOff", reasonCategory: "Transfer out", academicStatus: "Grade 4" }), ctx())
    ).toBeNull()
  })

  it("graduates only from the final grade unless overridden (D3)", () => {
    expect(validateStatusForm(form({ to: "Graduated" }), ctx())).toMatch(/final result/)
    expect(validateStatusForm(form({ to: "Graduated", finalResult: "Passed" }), ctx({ finalGrade: false }))).toMatch(
      /override/
    )
    expect(
      validateStatusForm(form({ to: "Graduated", finalResult: "Passed", graduationOverride: true }), ctx({ finalGrade: false }))
    ).toBeNull()
  })

  it("needs a class and session to readmit (D4)", () => {
    const from = ctx({ from: "StruckOff" })
    expect(validateStatusForm(form({ to: "Active" }), from)).toMatch(/class and session/)
    expect(validateStatusForm(form({ to: "Active", classId: "3", sessionId: "1" }), from)).toBeNull()
    expect(validateStatusForm(form({ to: "Active" }), ctx({ from: "Inactive" }))).toBeNull()
  })
})

describe("buildStatusBody", () => {
  it("sends only the fields for the chosen move", () => {
    expect(buildStatusBody(form({ to: "Inactive", reasonCategory: "Medical", academicStatus: "x" }), "Active")).toEqual({
      status: "Inactive",
      reason: "Parent request",
      effectiveOn: TODAY,
      reasonCategory: "Medical",
    })
    expect(
      buildStatusBody(
        form({ to: "StruckOff", reasonCategory: "Policy", academicStatus: " Grade 4 ", transferToSchool: "ABC" }),
        "Active"
      )
    ).not.toHaveProperty("transferToSchool")
    expect(
      buildStatusBody(
        form({ to: "StruckOff", reasonCategory: "Transfer out", academicStatus: "G4", transferToSchool: " ABC " }),
        "Active"
      ).transferToSchool
    ).toBe("ABC")
    expect(buildStatusBody(form({ to: "Active", classId: "3", sessionId: "1" }), "Graduated")).toMatchObject({
      classId: 3,
      sessionId: 1,
    })
    expect(buildStatusBody(form({ to: "Graduated", finalResult: "Passed", graduationOverride: true }), "Active")).toMatchObject(
      { finalResult: "Passed", graduationOverride: true }
    )
  })
})

describe("labels", () => {
  it("names each move with SRS verbs", () => {
    expect(actionLabel("Pending", "Active")).toBe("Enroll")
    expect(actionLabel("Inactive", "Active")).toBe("Reactivate")
    expect(actionLabel("StruckOff", "Active")).toBe("Readmit")
    expect(actionLabel("Active", "StruckOff")).toBe("Strike off")
    expect(actionLabel("Pending", "Withdrawn")).toBe("Withdraw enrollment")
    expect(isReadmission("Withdrawn", "Active")).toBe(true)
    expect(isReadmission("Pending", "Active")).toBe(false)
  })
})

describe("historyParams", () => {
  it("drops empty filters and converts ids", () => {
    expect(historyParams(emptyHistoryFilters, 2, 20)).toEqual({ page: 2, pageSize: 20 })
    expect(
      historyParams(
        { ...emptyHistoryFilters, type: "StruckOff", classId: "4", sessionId: "1", from: "2026-01-01", q: "  ali " },
        1,
        200
      )
    ).toEqual({ page: 1, pageSize: 200, type: "StruckOff", classId: 4, sessionId: 1, from: "2026-01-01", q: "ali" })
  })
})

const event = (over: Partial<LifecycleEvent> = {}): LifecycleEvent => ({
  id: "s1",
  date: "2026-10-01",
  type: "StruckOff",
  student: { id: 1, name: 'Ali "Junior" Khan', admissionNo: "ADM-1" },
  fromClass: "Grade 4",
  toClass: null,
  session: "2026–2027",
  fromStatus: "Active",
  toStatus: "StruckOff",
  reason: "Moved city",
  reasonCategory: "Transfer out",
  finalResult: null,
  academicStatus: "Grade 4",
  outstandingAmount: 1500,
  transferToSchool: "City School",
  graduationOverride: false,
  recordedBy: "Admin",
  ...over,
})

describe("eventDetail and CSV", () => {
  it("summarises each event", () => {
    expect(eventDetail(event())).toBe("Transfer out · to City School · dues 1500.00")
    expect(eventDetail(event({ type: "Promoted", toClass: "Grade 5" }))).toBe("Grade 4 → Grade 5")
    expect(eventDetail(event({ type: "Graduated", finalResult: "Passed", graduationOverride: true }))).toBe(
      "Grade 4 · Passed · override"
    )
  })

  it("escapes quotes and labels types", () => {
    const [header, row] = lifecycleToCsv([event()]).split("\n")
    expect(header.split(",")).toHaveLength(17)
    expect(row).toContain('"Ali ""Junior"" Khan"')
    expect(row).toContain('"Struck off"')
    expect(row).toContain('"1500.00"')
  })
})
