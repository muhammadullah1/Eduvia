import { describe, expect, it } from "vitest"

import { can } from "@/lib/permissions"

describe("permissions matrix", () => {
  it("allows super_admin full capability across system", () => {
    expect(can("super_admin", "fees.totals")).toBe(true)
    expect(can("super_admin", "fees.payments.record")).toBe(true)
    expect(can("super_admin", "fees.payments.allocate_manual")).toBe(true)
    expect(can("super_admin", "finance.manage")).toBe(true)
    expect(can("super_admin", "staff.create.any")).toBe(true)
    expect(can("super_admin", "exams.manage")).toBe(true)
    expect(can("super_admin", "results.override")).toBe(true)
  })

  it("limits accountant strictly to financial operations", () => {
    expect(can("accountant", "fees.payments.record")).toBe(true)
    expect(can("accountant", "fees.payments.confirm")).toBe(true)
    expect(can("accountant", "fees.status.view")).toBe(true)

    expect(can("accountant", "fees.totals")).toBe(false)
    expect(can("accountant", "fees.payments.allocate_manual")).toBe(false)
    expect(can("accountant", "finance.manage")).toBe(false)
    expect(can("accountant", "exams.manage")).toBe(false)
  })

  it("restricts teachers to grading and lesson submissions", () => {
    expect(can("teacher", "lessons.submit")).toBe(true)
    expect(can("teacher", "tests.marks")).toBe(true)

    expect(can("teacher", "lessons.review")).toBe(false)
    expect(can("teacher", "tests.publish")).toBe(false)
    expect(can("teacher", "fees.payments.record")).toBe(false)
    expect(can("teacher", "staff.create.any")).toBe(false)
  })

  it("denies parents access to administrative/staff permissions", () => {
    expect(can("parent", "fees.payments.record")).toBe(false)
    expect(can("parent", "fees.totals")).toBe(false)
    expect(can("parent", "lessons.submit")).toBe(false)
    expect(can("parent", "exams.manage")).toBe(false)
  })
})
