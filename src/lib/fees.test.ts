import { describe, expect, it } from "vitest"

import type { FeeMonth } from "@/data/types"
import {
  allocateOldestFirst,
  feeMonthStatus,
  isPaidThrough,
  outstanding,
  planOldestFirst,
  validateManualPlan,
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

  it("plans oldest-unpaid-first allocations deterministically", () => {
    // 2026-09 owes 3000, 2026-10 owes 5000. Total owed = 8000.
    // If payment is 4000: clears 3000 on 2026-09, 1000 on 2026-10.
    const plan = planOldestFirst(sampleMonths, 4000)
    expect(plan.lines).toEqual([
      { feeMonthId: "fm-2", month: "2026-09", amount: 3000 },
      { feeMonthId: "fm-3", month: "2026-10", amount: 1000 },
    ])
    expect(plan.leftover).toBe(0)
  })

  it("reports leftover when payment exceeds all outstanding months", () => {
    const plan = planOldestFirst(sampleMonths, 10000)
    expect(plan.lines).toEqual([
      { feeMonthId: "fm-2", month: "2026-09", amount: 3000 },
      { feeMonthId: "fm-3", month: "2026-10", amount: 5000 },
    ])
    expect(plan.leftover).toBe(2000)
  })

  it("validates manual allocation plans strictly", () => {
    const valid = validateManualPlan(sampleMonths, 3000, [
      { feeMonthId: "fm-2", amount: 3000 },
    ])
    expect("error" in valid).toBe(false)
    if (!("error" in valid)) {
      expect(valid.leftover).toBe(0)
      expect(valid.lines).toHaveLength(1)
    }

    const exceedsBalance = validateManualPlan(sampleMonths, 4000, [
      { feeMonthId: "fm-2", amount: 4000 },
    ])
    expect(exceedsBalance.error).toMatch(/exceeds the balance/)

    const exceedsPayment = validateManualPlan(sampleMonths, 2000, [
      { feeMonthId: "fm-2", amount: 2500 },
    ])
    expect(exceedsPayment.error).toMatch(/exceed the payment amount/)

    const invalidMonth = validateManualPlan(sampleMonths, 1000, [
      { feeMonthId: "fm-unknown", amount: 1000 },
    ])
    expect(invalidMonth.error).toMatch(/does not belong/)
  })

  it("checks whether student is paid through a given month", () => {
    expect(isPaidThrough(sampleMonths, "2026-08")).toBe(true)
    expect(isPaidThrough(sampleMonths, "2026-09")).toBe(false)
    expect(isPaidThrough(sampleMonths, "2026-10")).toBe(false)
  })

  it("allocates oldest first and generates advance months when excess exists", () => {
    // std-1 owes 3000 (09) + 5000 (10) = 8000. Payment is 13000 (+5000 for advance 11)
    const result = allocateOldestFirst(sampleMonths, {
      studentId: "std-1",
      amount: 13000,
      monthlyFee: 5000,
      currentMonth: "2026-09",
      newId: (m) => `fm-${m}`,
    })

    expect(result.leftover).toBe(0)
    expect(result.lines).toHaveLength(3)
    expect(result.lines[0]).toEqual({
      feeMonthId: "fm-2",
      month: "2026-09",
      amount: 3000,
    })
    expect(result.lines[1]).toEqual({
      feeMonthId: "fm-3",
      month: "2026-10",
      amount: 5000,
    })
    expect(result.lines[2]).toEqual({
      feeMonthId: "fm-2026-11",
      month: "2026-11",
      amount: 5000,
    })
  })
})
