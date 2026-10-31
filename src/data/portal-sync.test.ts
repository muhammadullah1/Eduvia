import { describe, expect, it } from "vitest"

import { ALL_ROLES, type Role } from "@/lib/auth"
import { DEFAULT_ROLE_PERMISSIONS } from "@/test/default-role-permissions.generated"

import {
  canListUserAccounts,
  readableSlices,
  resolvePortalSyncPlan,
  type SchoolDataSlice,
  SLICE_READ_PERMISSIONS,
  unavailableSlicesFor,
} from "./portal-sync"

const FEE_SLICES = ["feeMonths", "payments", "expenses"] as const
const defaults = (role: Role) => DEFAULT_ROLE_PERMISSIONS[role]

describe("permission-scoped portal sync with default roles", () => {
  it("never asks the API for management-only data on a teacher login", () => {
    const teacher = unavailableSlicesFor(defaults("teacher"))
    for (const slice of ["applications", "feeMonths", "payments", "expenses", "resultOverrides", "settings", "audits"] as const) {
      expect(teacher.has(slice)).toBe(true)
    }
    expect(teacher.has("attendance")).toBe(false)
    expect(teacher.has("staff")).toBe(false)
    expect(canListUserAccounts(defaults("teacher"))).toBe(false)
  })

  it("super admin reads everything", () => {
    expect(unavailableSlicesFor(defaults("super_admin")).size).toBe(0)
    expect(canListUserAccounts(defaults("super_admin"))).toBe(true)
  })

  it("operations manager never loads fee data but reads the audit log", () => {
    const permissions = defaults("operations_manager")
    const ops = unavailableSlicesFor(permissions)
    for (const slice of FEE_SLICES) expect(ops.has(slice)).toBe(true)
    expect(ops.has("audits")).toBe(false)
    expect(ops.has("settings")).toBe(false)
    expect(ops.has("applications")).toBe(false)
    expect(canListUserAccounts(permissions)).toBe(true)
    for (const section of ["dashboard", "overview", "results-gate", "reports", "fees", "finance", "collect-fee"]) {
      const plan = resolvePortalSyncPlan("operations_manager", permissions, section)
      expect(plan.mode).toBe("partial")
      if (plan.mode === "partial") for (const slice of FEE_SLICES) expect(plan.slices).not.toContain(slice)
    }
  })

  it("accountant loads fee data but nothing academic-management only", () => {
    const acc = unavailableSlicesFor(defaults("accountant"))
    for (const slice of FEE_SLICES) expect(acc.has(slice)).toBe(false)
    for (const slice of ["settings", "applications", "resultOverrides", "audits"] as const) {
      expect(acc.has(slice)).toBe(true)
    }
    expect(canListUserAccounts(defaults("accountant"))).toBe(false)
  })

  it("parent loads only parent-visible data", () => {
    const parent = unavailableSlicesFor(defaults("parent"))
    for (const slice of ["settings", "applications", "expenses", "resultOverrides", "audits"] as const) {
      expect(parent.has(slice)).toBe(true)
    }
    for (const slice of ["feeMonths", "payments", "attendance", "students", "updates"] as const) expect(parent.has(slice)).toBe(false)
    expect(canListUserAccounts(defaults("parent"))).toBe(false)
  })

  it("follows a permission change: granting audit.read lets an accountant load the audit log", () => {
    expect(unavailableSlicesFor([...defaults("accountant"), "audit.read"]).has("audits")).toBe(false)
  })

  it("every slice has a rule and readableSlices respects it for every role", () => {
    const all = Object.keys(SLICE_READ_PERMISSIONS).filter((s) => s !== "users") as SchoolDataSlice[]
    for (const role of ALL_ROLES as Role[]) {
      const allowed = readableSlices(defaults(role), all)
      for (const slice of all) expect(allowed.includes(slice)).toBe(defaults(role).includes(SLICE_READ_PERMISSIONS[slice]))
    }
    expect(readableSlices(undefined, ["classes"])).toEqual(["classes"])
  })
})
