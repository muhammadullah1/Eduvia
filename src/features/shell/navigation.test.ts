import { describe, expect, it } from "vitest"

import { holds, type PermissionKey } from "@/lib/access"
import { portalForRole, type Role } from "@/lib/auth"
import { DEFAULT_ROLE_PERMISSIONS } from "@/test/default-role-permissions.generated"

import { allowedSections, findSection, isSectionAllowed, LEGACY_SECTIONS } from "./navigation"
import { type NavFolder, navigationMenuTree,type NavNode } from "./navigation-menu-tree"

const FEE_SECTIONS = ["fees", "collect-fee", "offline-sync", "finance", "collections", "fee-structure", "fee-generation", "fee-concessions", "expenses"]

const canWith = (permissions: readonly PermissionKey[]) => (key: PermissionKey) => holds(permissions, key)

function sectionIdsFor(role: Role, extra: readonly PermissionKey[] = []) {
  const can = canWith([...DEFAULT_ROLE_PERMISSIONS[role], ...extra])
  return new Set(allowedSections(portalForRole(role), can).map((item) => item.id))
}

function treeFor(role: Role) {
  const portal = portalForRole(role)
  return navigationMenuTree(portal, allowedSections(portal, canWith(DEFAULT_ROLE_PERMISSIONS[role])))
}

const nodeId = (node: NavNode) => (node.type === "link" && node.id) || (node.type === "folder" && node.key)

describe("Operations Manager default navigation", () => {
  it("has no fee or finance sections", () => {
    const ids = sectionIdsFor("operations_manager")
    for (const id of FEE_SECTIONS) expect(ids.has(id)).toBe(false)
  })

  it("opens Reports for student reports and the audit trail instead of the separate audit log", () => {
    const ids = sectionIdsFor("operations_manager")
    expect(ids.has("reports")).toBe(true)
    expect(ids.has("audit-log")).toBe(false)
  })

  it("cannot open Roles & Permissions", () => {
    expect(sectionIdsFor("operations_manager").has("roles")).toBe(false)
  })
})

describe("Super Admin default navigation", () => {
  it("keeps reports, finance and roles; reports replace the separate audit log", () => {
    const ids = sectionIdsFor("super_admin")
    for (const id of ["reports", "fees", "collect-fee", "offline-sync", "finance", "roles", "settings"]) {
      expect(ids.has(id)).toBe(true)
    }
    expect(ids.has("audit-log")).toBe(false)
  })
})

describe("Accountant default navigation", () => {
  it("keeps fee collection and own receipts but no audit log or settings", () => {
    const ids = sectionIdsFor("accountant")
    for (const id of ["collect-fee", "collections", "expenses"]) expect(ids.has(id)).toBe(true)
    for (const id of ["audit-log", "settings", "roles"]) expect(ids.has(id)).toBe(false)
  })

  it("shows a newly granted permission's section without a code change", () => {
    expect(sectionIdsFor("accountant", ["audit.read"]).has("audit-log")).toBe(true)
  })
})

describe("section rules", () => {
  it("hides a section when its hiddenWith permission is held", () => {
    const item = findSection("admin", "audit-log")
    expect(item).toBeDefined()
    if (!item) return
    expect(isSectionAllowed(item, canWith(["audit.read"]))).toBe(true)
    expect(isSectionAllowed(item, canWith(["audit.read", "students.manage"]))).toBe(false)
  })

  it("maps legacy sections to their new homes", () => {
    expect(LEGACY_SECTIONS["settings-roles"]?.section).toBe("roles")
    expect(LEGACY_SECTIONS.overview?.section).toBe("dashboard")
    expect(LEGACY_SECTIONS.collect?.section).toBe("collect-fee")
  })

  it("nothing is allowed without permissions", () => {
    for (const portal of ["admin", "teacher", "parent"] as const) {
      expect(allowedSections(portal, canWith([]))).toEqual([])
    }
  })
})

describe("Settings sidebar folder", () => {
  it("Super Admin's Settings folder ends with Roles & Permissions", () => {
    const settings = treeFor("super_admin").find(
      (node): node is NavFolder => node.type === "folder" && node.key === "settings"
    )
    expect(settings?.label).toBe("Settings")
    expect(settings?.children.map((child) => child.id)).toContain("roles")
  })

  it("Operations Manager's Settings folder has no Roles & Permissions link", () => {
    const settings = treeFor("operations_manager").find(
      (node): node is NavFolder => node.type === "folder" && node.key === "settings"
    )
    expect(settings).toBeDefined()
    expect(settings?.children.map((child) => child.id)).not.toContain("roles")
  })

  it("Accountant, Teacher and Parent have no Settings entry", () => {
    for (const role of ["accountant", "teacher", "parent"] as const) {
      expect(treeFor(role).map(nodeId)).not.toContain("settings")
    }
  })
})
