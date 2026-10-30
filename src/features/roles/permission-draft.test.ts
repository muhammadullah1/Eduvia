import { describe, expect, it } from "vitest"

import type { PermissionCatalog, RolePermissionState } from "@/api/roles/roles.service"

import { diffPermissions, grantedKeys, groupByModule, isEditable, toggleKey, toggleModule } from "./permission-draft"

const CATALOG: PermissionCatalog = {
  actions: ["read", "manage"],
  modules: [
    { key: "audit", label: "Audit", description: "Audit trail", sensitive: true },
    { key: "students", label: "Students", description: "Students", sensitive: false },
    { key: "empty", label: "Empty", description: "No permissions", sensitive: false },
  ],
  permissions: [
    { key: "students.read", module: "students", action: "read", label: "View students", description: "", risk: "low" },
    { key: "students.manage", module: "students", action: "manage", label: "Manage students", description: "", risk: "high" },
    { key: "audit.read", module: "audit", action: "read", label: "View audit", description: "", risk: "low" },
  ],
}

const STATES: RolePermissionState[] = [
  { key: "students.read", granted: true, isDefault: true, lockReason: null },
  { key: "students.manage", granted: false, isDefault: false, lockReason: null },
  { key: "audit.read", granted: false, isDefault: false, lockReason: "Only the Super Admin can hold this permission." },
]

describe("permission draft", () => {
  const groups = groupByModule(CATALOG, STATES)
  const studentRows = groups.find((group) => group.module.key === "students")?.rows ?? []

  it("groups permissions by module in catalog order and drops empty modules", () => {
    expect(groups.map((group) => group.module.key)).toEqual(["audit", "students"])
    expect(studentRows.map((row) => row.key)).toEqual(["students.read", "students.manage"])
  })

  it("marks sensitive modules and high-risk permissions as sensitive", () => {
    expect(groups.find((group) => group.module.key === "audit")?.rows.every((row) => row.sensitive)).toBe(true)
    expect(studentRows.map((row) => row.sensitive)).toEqual([false, true])
  })

  it("treats any lock reason as not editable", () => {
    const auditRow = groups.find((group) => group.module.key === "audit")?.rows.find((row) => row.key === "audit.read")
    expect(auditRow && isEditable(auditRow)).toBe(false)
    expect(studentRows.every(isEditable)).toBe(true)
  })

  it("diffs a draft against the saved set", () => {
    const saved = grantedKeys(STATES)
    const draft = toggleKey(toggleKey(saved, "students.read", false), "students.manage", true)
    expect(diffPermissions(saved, draft)).toEqual({ added: ["students.manage"], removed: ["students.read"] })
    expect(diffPermissions(saved, saved)).toEqual({ added: [], removed: [] })
  })

  it("toggles a whole module without touching locked rows", () => {
    const auditRows = groups.find((group) => group.module.key === "audit")?.rows ?? []
    expect(toggleModule(new Set(), auditRows, true).size).toBe(0)
    expect([...toggleModule(new Set(), studentRows, true)].sort()).toEqual(["students.manage", "students.read"])
    expect(toggleModule(new Set(["students.read"]), studentRows, false).size).toBe(0)
  })
})
