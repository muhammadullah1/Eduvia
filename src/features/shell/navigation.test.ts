import { describe, expect, it } from "vitest"

import { canReadSlice } from "@/data/portal-sync"
import { can } from "@/lib/permissions"

import { navigation, sectionIds } from "./navigation"

const FEE_SECTIONS = ["fees", "collect-fee", "offline-sync", "finance", "reports", "collect", "collections", "fee-structure", "fee-generation", "expenses"]

describe("Operations Manager navigation", () => {
  it("has no fee, finance or fee-report sections, so the route guard refuses them", () => {
    for (const id of FEE_SECTIONS) expect(sectionIds.operations_manager.has(id)).toBe(false)
  })

  it("offers a read-only audit log backed by the audit permission and slice", () => {
    expect(navigation.operations_manager.map((item) => item.id)).toContain("audit-log")
    expect(can("operations_manager", "audit.view")).toBe(true)
    expect(canReadSlice("operations_manager", "audits")).toBe(true)
  })

  it("never reads fee data or fee amounts", () => {
    for (const slice of ["feeMonths", "payments", "expenses"] as const) {
      expect(canReadSlice("operations_manager", slice)).toBe(false)
    }
    expect(can("operations_manager", "fees.amounts.view")).toBe(false)
    expect(can("operations_manager", "fees.reports")).toBe(false)
  })
})

describe("other roles keep their sections", () => {
  it("Super Admin keeps Reports and finance; only SA and Ops see the audit log", () => {
    for (const id of ["reports", "fees", "collect-fee", "offline-sync", "finance"]) {
      expect(sectionIds.super_admin.has(id)).toBe(true)
    }
    expect(can("super_admin", "audit.view")).toBe(true)
    expect(can("accountant", "audit.view")).toBe(false)
    expect(can("teacher", "audit.view")).toBe(false)
    expect(canReadSlice("accountant", "audits")).toBe(false)
  })

  it("Accountant keeps record payment and daily receipts", () => {
    expect(sectionIds.accountant.has("collect")).toBe(true)
    expect(sectionIds.accountant.has("collections")).toBe(true)
    expect(can("accountant", "fees.amounts.view")).toBe(true)
  })
})
