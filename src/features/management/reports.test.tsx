import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Role } from "@/lib/auth"

import { AuditLogPage, Reports } from "./reports"

let currentRole: Role = "super_admin"

vi.mock("@/lib/actor", () => ({
  useActor: () => ({ role: currentRole, name: "Admin", email: "admin@cls.edu" }),
}))

vi.mock("@/features/management/fee-reports", () => ({
  FeeReportsPanel: () => <div data-testid="fee-reports-panel">Fee Reports Panel Content</div>,
}))

vi.mock("@/data/store", () => ({
  useSchool: () => ({
    state: {
      audits: [
        {
          id: "audit-1",
          actor: "Super Admin",
          action: "updated setting fees",
          at: new Date().toISOString(),
          entity: "school_setting",
        },
      ],
    },
  }),
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
  })

  afterEach(cleanup)

  it("renders exactly 2 clean tabs: Fee reports and Audit trail", () => {
    wrap(<Reports />)

    const tablist = screen.getByRole("tablist", { name: "Reports" })
    const tabs = within(tablist).getAllByRole("tab")
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(["Fee reports", "Audit trail"])
    expect(screen.getByTestId("fee-reports-panel")).toBeTruthy()
  })

  it("switches to Audit trail when clicked and back to Fee reports seamlessly", () => {
    wrap(<Reports />)

    const auditTab = screen.getByRole("tab", { name: "Audit trail" })
    fireEvent.click(auditTab)

    expect(screen.getByText("Security audit trail")).toBeTruthy()
    expect(screen.getByText("updated setting fees")).toBeTruthy()
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
  })

  afterEach(cleanup)

  it("renders the read-only audit log page", () => {
    wrap(<AuditLogPage />)
    expect(screen.getByText("Audit log")).toBeTruthy()
    expect(screen.getByText("Security audit trail")).toBeTruthy()
    expect(screen.getByText("updated setting fees")).toBeTruthy()
  })
})
