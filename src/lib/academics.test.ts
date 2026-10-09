import { describe, expect, it } from "vitest"

import type { FeeMonth, MarkSheet, ResultOverride } from "@/data/types"
import { activeOverride, feeCleared, resultVisibility } from "@/lib/academics"

const dummySheet: MarkSheet = {
  id: "sheet-1",
  examId: "exam-midterm",
  examName: "Midterm Examination",
  classId: "g4b",
  subject: "Mathematics",
  max: 100,
  feeMonth: "2026-09",
  status: "Published",
  rows: [],
}

const paidMonths: FeeMonth[] = [
  {
    id: "fm-1",
    studentId: "std-1",
    month: "2026-09",
    feeType: "Tuition",
    amountDue: 5000,
    amountPaid: 5000,
    dueDate: "2026-09-10",
  },
]

const unpaidMonths: FeeMonth[] = [
  {
    id: "fm-1",
    studentId: "std-1",
    month: "2026-09",
    feeType: "Tuition",
    amountDue: 5000,
    amountPaid: 0,
    dueDate: "2026-09-10",
  },
]

const activeOverrideRow: ResultOverride = {
  id: "ov-1",
  examId: "exam-midterm",
  studentId: "std-1",
  reason: "Principal dispensation",
  grantedBy: "Admin",
  grantedAt: "2026-09-15",
}

const revokedOverrideRow: ResultOverride = {
  id: "ov-2",
  examId: "exam-midterm",
  studentId: "std-1",
  reason: "Expired",
  grantedBy: "Admin",
  grantedAt: "2026-09-01",
  revokedAt: "2026-09-10",
}

describe("academics result visibility", () => {
  it("finds active overrides and ignores revoked overrides", () => {
    expect(
      activeOverride([activeOverrideRow], "exam-midterm", "std-1")
    ).toBeDefined()
    expect(
      activeOverride([revokedOverrideRow], "exam-midterm", "std-1")
    ).toBeUndefined()
  })

  it("evaluates fee cleared condition under different rules", () => {
    expect(
      feeCleared(
        paidMonths,
        "std-1",
        "2026-09",
        "exam_month_paid",
        "2026-09-15"
      )
    ).toBe(true)
    expect(
      feeCleared(
        unpaidMonths,
        "std-1",
        "2026-09",
        "exam_month_paid",
        "2026-09-15"
      )
    ).toBe(false)
    // Rule disabled always clears fees
    expect(
      feeCleared(unpaidMonths, "std-1", "2026-09", "disabled", "2026-09-15")
    ).toBe(true)
  })

  it("hides results from parents when sheet is not published even if fees are paid", () => {
    const draftSheet: MarkSheet = { ...dummySheet, status: "Draft" }
    const res = resultVisibility(draftSheet, "std-1", {
      feeMonths: paidMonths,
      overrides: [],
      rule: "exam_month_paid",
      today: "2026-09-15",
    })
    expect(res.published).toBe(false)
    expect(res.visible).toBe(false)
  })

  it("shows results when published and fees are cleared", () => {
    const res = resultVisibility(dummySheet, "std-1", {
      feeMonths: paidMonths,
      overrides: [],
      rule: "exam_month_paid",
      today: "2026-09-15",
    })
    expect(res.visible).toBe(true)
  })

  it("hides results when published but fees are unpaid and no override exists", () => {
    const res = resultVisibility(dummySheet, "std-1", {
      feeMonths: unpaidMonths,
      overrides: [],
      rule: "exam_month_paid",
      today: "2026-09-15",
    })
    expect(res.visible).toBe(false)
  })

  it("shows results when published, fees are unpaid, BUT an active override exists", () => {
    const res = resultVisibility(dummySheet, "std-1", {
      feeMonths: unpaidMonths,
      overrides: [activeOverrideRow],
      rule: "exam_month_paid",
      today: "2026-09-15",
    })
    expect(res.visible).toBe(true)
    expect(res.override).toBeDefined()
  })
})
