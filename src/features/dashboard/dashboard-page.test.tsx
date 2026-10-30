import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Dashboard, DashboardWidgets } from "@/api/dashboard/dashboard.service"
import { grantRoleDefaults } from "@/test/permissions"

import { share } from "./dashboard-format"
import { DashboardPage } from "./dashboard-page"

const svc = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/dashboard/dashboard.service", async (orig) => ({
  ...(await orig<typeof import("@/api/dashboard/dashboard.service")>()),
  default: svc,
}))

const PERIOD = { key: "2026-10", kind: "month" as const, label: "October 2026", from: "2026-10-01", to: "2026-11-01" }
const payload = (widgets: DashboardWidgets): Dashboard => ({ period: PERIOD, today: "2026-10-30", widgets, generatedAt: "2026-10-30T05:00:00Z" })
const ATTENDANCE = { today: { marked: 4, present: 3, absent: 1, leave: 0, percent: 75 }, trend: [{ date: "2026-10-30", percent: 75 }] }
const ADMIN: DashboardWidgets = {
  students: { active: 120 },
  teachers: { active: 9 },
  attendance: ATTENDANCE,
  absentTeachers: [{ teacherId: 1, name: "Sana Malik", periods: 3, covered: 2, uncovered: 1 }],
  pending: { concessions: 2, resultsToPublish: 1 },
  finance: {
    collected: 150000, expected: 300000, paidAgainstBills: 120000, collectionRate: 40, outstanding: 90000,
    trend: [{ month: "2026-10", label: "Oct 2026", amount: 150000 }],
    byMethod: [{ method: "BankTransfer", amount: 150000, receipts: 3 }],
    defaulterClasses: [{ classId: 4, label: "Class 5 – A", students: 6, amount: 42000 }],
    recentPayments: [{ id: 7, receiptNo: "RCPT-7", date: "2026-10-30", method: "Cash", amount: 5000, studentName: "Ali Khan", classLabel: "Class 5 – A" }],
  },
  incomeVsExpenses: { income: 160000, expenses: 170000, net: -10000 },
  alerts: { classesWithoutFeeStructure: [{ classId: 9, label: "Class 9 – B" }], failedImports: 1 },
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onOpen = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <DashboardPage onOpen={onOpen} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return onOpen
}

beforeEach(() => svc.get.mockReset())
afterEach(cleanup)

describe("staff dashboard", () => {
  it("shows the Super Admin's finances, approvals, alerts and the period picker", async () => {
    grantRoleDefaults("super_admin")
    svc.get.mockResolvedValue(payload(ADMIN))
    const onOpen = mount()
    expect((await screen.findByTestId("dash-kpis")).textContent).toContain("PKR 150,000")
    expect(svc.get).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/))
    expect(screen.getByRole("combobox", { name: "Period" })).toBeTruthy()
    expect(screen.getByText("Outstanding dues")).toBeTruthy()
    expect(screen.getByTestId("dash-net").textContent).toContain("-10,000")
    expect(screen.getByTestId("pending-concessions").textContent).toBe("2")
    expect(screen.getByText("Class 9 – B has no fee structure")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Record expense" }).getAttribute("href")).toBe("/admin/finance?tab=expenses")
    fireEvent.click(screen.getByText("Concession approvals"))
    expect(onOpen).toHaveBeenCalledWith("fees")
  })

  it("renders only what the Operations Manager's payload holds, with no money", async () => {
    grantRoleDefaults("operations_manager")
    svc.get.mockResolvedValue(payload({ students: { active: 120 }, attendance: ATTENDANCE, feeStatus: { month: "2026-10", label: "Oct 2026", cleared: 80, notCleared: 40 } }))
    mount()
    expect(await screen.findByTestId("dash-fee-status")).toBeTruthy()
    expect(screen.queryByText(/PKR/)).toBeNull()
    expect(screen.queryByRole("combobox", { name: "Period" })).toBeNull()
    expect(screen.getByTestId("dash-attendance-percent").textContent).toBe("75%")
  })

  it("gives the Accountant receipt rows and counts but no totals", async () => {
    grantRoleDefaults("accountant")
    svc.get.mockResolvedValue(payload({
      myReceiptsToday: { date: "2026-10-30", rows: [{ id: 1, receiptNo: "RCPT-1", studentName: "Ali Khan", admissionNo: "A1", paymentDate: "2026-10-30", feeMonths: ["Oct 2026"], amount: 5000, method: "Cash" }] },
      generation: { month: "2026-10", label: "Oct 2026", activeStudents: 10, billed: 8, notBilled: 2 },
      myImports: [],
    }))
    mount()
    expect(await screen.findByText("RCPT-1")).toBeTruthy()
    expect(screen.queryByTestId("dash-kpis")).toBeNull()
    expect(screen.getByTestId("dash-not-billed").textContent).toBe("2")
    expect(screen.getByText("No import batches uploaded yet.")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Collect fee" })).toBeTruthy()
  })

  it("shows loading, then an error with a retry", async () => {
    grantRoleDefaults("super_admin")
    svc.get.mockRejectedValueOnce(new Error("Server unreachable")).mockResolvedValue(payload({}))
    mount()
    expect(screen.getByTestId("dash-loading")).toBeTruthy()
    expect(await screen.findByText("Server unreachable")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("Nothing to show yet")).toBeTruthy()
  })

  it("computes bar shares without dividing by zero", () => {
    expect(share(1, 4)).toBe(25)
    expect(share(5, 0)).toBe(0)
  })
})
