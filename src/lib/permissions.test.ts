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
    expect(can("accountant", "fees.status.view")).toBe(true)
    expect(can("accountant", "fees.import")).toBe(true)
    expect(can("accountant", "fees.reports")).toBe(true)
    expect(can("accountant", "fees.structure.view")).toBe(true)

    // API fees.payments.confirm is Super Admin only — UI must not offer Confirm.
    expect(can("accountant", "fees.payments.confirm")).toBe(false)
    expect(can("super_admin", "fees.payments.confirm")).toBe(true)

    expect(can("accountant", "fees.totals")).toBe(false)
    expect(can("accountant", "fees.payments.allocate_manual")).toBe(false)
    expect(can("accountant", "fees.structure.manage")).toBe(false)
    expect(can("accountant", "finance.manage")).toBe(false)
    expect(can("accountant", "exams.manage")).toBe(false)
    expect(can("accountant", "settings.fees")).toBe(false)
    expect(can("accountant", "results.override")).toBe(false)
  })

  it("keeps operations manager off fee confirm and fee settings writes", () => {
    expect(can("operations_manager", "fees.payments.confirm")).toBe(false)
    expect(can("operations_manager", "fees.payments.record")).toBe(false)
    expect(can("operations_manager", "settings.fees")).toBe(false)
    expect(can("operations_manager", "settings.results")).toBe(false)
    expect(can("operations_manager", "settings.academic")).toBe(true)
    expect(can("operations_manager", "lessons.review")).toBe(true)
    expect(can("operations_manager", "tests.publish")).toBe(true)
    expect(can("operations_manager", "audit.view")).toBe(true)
    expect(can("operations_manager", "families.manage")).toBe(true)
    expect(can("operations_manager", "fees.concessions.view")).toBe(false)
  })

  it("gates concessions and bill adjustments correctly", () => {
    expect(can("super_admin", "fees.concessions.approve")).toBe(true)
    expect(can("super_admin", "fees.months.adjust")).toBe(true)
    expect(can("accountant", "fees.concessions.request")).toBe(true)
    expect(can("accountant", "fees.concessions.approve")).toBe(false)
    expect(can("accountant", "fees.months.adjust")).toBe(false)
    expect(can("accountant", "families.view")).toBe(true)
    expect(can("accountant", "families.manage")).toBe(false)
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
