import { describe, expect, it } from "vitest"

import { ALL_ROLES, type Role } from "@/lib/auth"

import {
  canListUserAccounts,
  readableSlices,
  resolvePortalSyncPlan,
  type SchoolDataSlice,
  SLICE_READ_ROLES,
  unavailableSlicesFor,
} from "./portal-sync"

const FEE_SLICES = ["feeMonths", "payments", "expenses"] as const

describe("role-scoped portal sync", () => {
  it("never asks the API for management-only data on a teacher login", () => {
    const teacher = unavailableSlicesFor("teacher")
    for (const slice of ["applications", "feeMonths", "payments", "expenses", "resultOverrides", "settings", "audits"] as const) {
      expect(teacher.has(slice)).toBe(true)
    }
    expect(teacher.has("attendance")).toBe(false)
    expect(teacher.has("staff")).toBe(false)
    expect(canListUserAccounts("teacher")).toBe(false)
  })

  it("super admin reads everything", () => {
    expect(unavailableSlicesFor("super_admin").size).toBe(0)
    expect(canListUserAccounts("super_admin")).toBe(true)
  })

  it("operations manager never loads fee data but reads the audit log", () => {
    const ops = unavailableSlicesFor("operations_manager")
    for (const slice of FEE_SLICES) expect(ops.has(slice)).toBe(true)
    expect(ops.has("audits")).toBe(false)
    expect(ops.has("settings")).toBe(false)
    expect(ops.has("applications")).toBe(false)
    expect(canListUserAccounts("operations_manager")).toBe(true)
    for (const section of ["dashboard", "overview", "results-gate", "reports", "fees", "finance", "collect-fee"]) {
      const plan = resolvePortalSyncPlan("operations_manager", section)
      expect(plan.mode).toBe("partial")
      if (plan.mode === "partial") for (const slice of FEE_SLICES) expect(plan.slices).not.toContain(slice)
    }
  })

  it("accountant loads fee data but nothing academic-management only", () => {
    const acc = unavailableSlicesFor("accountant")
    for (const slice of FEE_SLICES) expect(acc.has(slice)).toBe(false)
    for (const slice of ["settings", "staff", "applications", "sheets", "resultOverrides", "attendance", "plannedChapters", "dailyLessons", "slots", "teacherAbsences", "substitutions", "testSchedules", "weeklyTests", "audits"] as const) {
      expect(acc.has(slice)).toBe(true)
    }
    expect(canListUserAccounts("accountant")).toBe(false)
  })

  it("parent loads only parent-visible data", () => {
    const parent = unavailableSlicesFor("parent")
    for (const slice of ["settings", "staff", "applications", "expenses", "resultOverrides", "plannedChapters", "teacherAbsences", "substitutions", "audits"] as const) {
      expect(parent.has(slice)).toBe(true)
    }
    for (const slice of ["feeMonths", "payments", "attendance", "students", "updates"] as const) expect(parent.has(slice)).toBe(false)
    expect(canListUserAccounts("parent")).toBe(false)
  })

  it("every slice has a rule and readableSlices respects it for every role", () => {
    const all = Object.keys(SLICE_READ_ROLES).filter((s) => s !== "users") as SchoolDataSlice[]
    for (const role of ALL_ROLES as Role[]) {
      const allowed = readableSlices(role, all)
      for (const slice of all) expect(allowed.includes(slice)).toBe(SLICE_READ_ROLES[slice].includes(role))
    }
    expect(readableSlices(undefined, ["classes"])).toEqual(["classes"])
  })
})
