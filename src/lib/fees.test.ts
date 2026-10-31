import { describe, expect, it } from "vitest"

import type { FeeMonth } from "@/data/types"
import {
  feeMonthStatus,
  isPaidThrough,
  outstanding,
} from "@/lib/fees"

const sampleMonths: FeeMonth[] = [
  {
    id: "fm-1",
    studentId: "std-1",
    month: "2026-08",
    feeType: "Tuition",
    amountDue: 5000,
    amountPaid: 5000,
    dueDate: "2026-08-10",
  },
  {
    id: "fm-2",
    studentId: "std-1",
    month: "2026-09",
    feeType: "Tuition",
    amountDue: 5000,
    amountPaid: 2000,
    dueDate: "2026-09-10",
  },
  {
    id: "fm-3",
    studentId: "std-1",
    month: "2026-10",
    feeType: "Tuition",
    amountDue: 5000,
    amountPaid: 0,
    dueDate: "2026-10-10",
  },
]

describe("fees domain logic", () => {
  it("calculates outstanding balances correctly", () => {
    expect(outstanding(sampleMonths[0])).toBe(0)
    expect(outstanding(sampleMonths[1])).toBe(3000)
    expect(outstanding(sampleMonths[2])).toBe(5000)
  })

  it("determines correct fee month status", () => {
    expect(feeMonthStatus(sampleMonths[0], "2026-09")).toBe("Paid")
    expect(feeMonthStatus(sampleMonths[1], "2026-09")).toBe("Partially Paid")
    expect(feeMonthStatus(sampleMonths[2], "2026-09")).toBe("Unpaid")
    expect(
      feeMonthStatus(
        { amountDue: 5000, amountPaid: 5000, month: "2026-11" },
        "2026-09"
      )
    ).toBe("Advance")
  })

  it("checks whether student is paid through a given month", () => {
    expect(isPaidThrough(sampleMonths, "2026-08")).toBe(true)
    expect(isPaidThrough(sampleMonths, "2026-09")).toBe(false)
    expect(isPaidThrough(sampleMonths, "2026-10")).toBe(false)
  })


})
