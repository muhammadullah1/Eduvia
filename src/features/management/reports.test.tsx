import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Role } from "@/lib/auth"
import { grantRoleDefaults } from "@/test/permissions"

import { AuditLogPage, Reports } from "./reports"

let currentRole: Role = "super_admin"

vi.mock("@/lib/actor", () => ({
  useActor: () => ({ role: currentRole, name: "Admin", email: "admin@cls.edu" }),
}))

vi.mock("@/features/management/fee-reports", () => ({
  FeeReportsPanel: () => <div data-testid="fee-reports-panel">Fee Reports Panel Content</div>,
}))

vi.mock("@/features/management/student-reports", () => ({
  StudentReportsPanel: () => <div data-testid="student-reports-panel">Student Reports Panel Content</div>,
}))

vi.mock("@/api/audit/audit.service", () => ({
  default: {
    list: vi.fn().mockResolvedValue([
      {
        id: "audit-1",
        actor: "Super Admin",
        action: "updated setting fees",
        at: new Date().toISOString(),
        entity: "school_setting",
      },
    ]),
  },
}))

function wrap(node: ReactNode, initialEntries = ["/admin/reports"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("Reports Component", () => {
  beforeEach(() => {
    currentRole = "super_admin"
    grantRoleDefaults("super_admin")
  })

  afterEach(cleanup)

  const tabNames = () =>
    within(screen.getByRole("tablist", { name: "Reports" }))
      .getAllByRole("tab")
      .map((t) => t.textContent?.trim())

  it("super admin sees student, fee and audit tabs plus finance and exam links", () => {
    wrap(<Reports />)

    expect(tabNames()).toEqual(["Student reports", "Fee reports", "Audit trail"])
    expect(screen.getByTestId("student-reports-panel")).toBeTruthy()
    expect(screen.getByRole("link", { name: /Financial report/ }).getAttribute("href")).toBe("/admin/finance?tab=report")
    expect(screen.getByRole("link", { name: /Exam documents/ }).getAttribute("href")).toBe("/admin/exams")
  })

  it("operations manager gets student reports and audit, but no fee or finance figures", () => {
    currentRole = "operations_manager"
    grantRoleDefaults("operations_manager")
    wrap(<Reports />)

    expect(tabNames()).toEqual(["Student reports", "Audit trail"])
    expect(screen.queryByRole("link", { name: /Financial report/ })).toBeNull()
    expect(screen.queryByTestId("fee-reports-panel")).toBeNull()
  })

  it("accountant only sees fee reports", () => {
    currentRole = "accountant"
    grantRoleDefaults("accountant")
    wrap(<Reports />)

    expect(screen.queryByRole("tablist", { name: "Reports" })).toBeNull()
    expect(screen.getByTestId("fee-reports-panel")).toBeTruthy()
    expect(screen.queryByTestId("student-reports-panel")).toBeNull()
    expect(screen.queryByRole("link", { name: /Exam documents/ })).toBeNull()
  })

  it("switches to Audit trail when clicked and back to Fee reports seamlessly", async () => {
    wrap(<Reports />, ["/admin/reports?tab=fees"])
    expect(screen.getByTestId("fee-reports-panel")).toBeTruthy()

    const auditTab = screen.getByRole("tab", { name: "Audit trail" })
    fireEvent.click(auditTab)

    expect(screen.getByText("Security audit trail")).toBeTruthy()
    expect(await screen.findByText("updated setting fees")).toBeTruthy()
    expect(screen.queryByTestId("fee-reports-panel")).toBeNull()

    const feesTab = screen.getByRole("tab", { name: "Fee reports" })
    fireEvent.click(feesTab)

    expect(screen.getByTestId("fee-reports-panel")).toBeTruthy()
    expect(screen.queryByText("Security audit trail")).toBeNull()
  })
})

describe("AuditLogPage", () => {
  beforeEach(() => {
    currentRole = "operations_manager"
    grantRoleDefaults("operations_manager")
  })

  afterEach(cleanup)

  it("renders the read-only audit log page", async () => {
    wrap(<AuditLogPage />)
    expect(screen.getByText("Audit log")).toBeTruthy()
    expect(screen.getByText("Security audit trail")).toBeTruthy()
    expect(await screen.findByText("updated setting fees")).toBeTruthy()
  })
})
