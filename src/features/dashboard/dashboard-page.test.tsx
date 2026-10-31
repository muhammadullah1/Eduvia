import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Dashboard, DashboardWidgets } from "@/api/dashboard/dashboard.service"
import { grantRoleDefaults } from "@/test/permissions"

import { percentChange, pointBefore, share } from "./dashboard-format"
import { DashboardPage } from "./dashboard-page"

const svc = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/dashboard/dashboard.service", async (orig) => ({
  ...(await orig<typeof import("@/api/dashboard/dashboard.service")>()),
  default: svc,
}))

const PERIOD = { key: "2026-10", kind: "month" as const, label: "October 2026", from: "2026-10-01", to: "2026-11-01" }
const payload = (widgets: DashboardWidgets): Dashboard => ({ period: PERIOD, today: "2026-10-30", widgets, generatedAt: "2026-10-30T05:00:00Z" })
const ATTENDANCE = { today: { marked: 4, present: 3, absent: 1, leave: 0, percent: 75 }, trend: [{ date: "2026-10-29", percent: 50, absent: 2 }, { date: "2026-10-30", percent: 75, absent: 1 }] }
const ADMIN: DashboardWidgets = {
  students: { active: 120 },
  teachers: { active: 9 },
  attendance: ATTENDANCE,
  absentTeachers: [{ teacherId: 1, name: "Sana Malik", periods: 3, covered: 2, uncovered: 1 }],
  pending: { concessions: 2, resultsToPublish: 1, adjustments: 0 },
  finance: {
    collected: 150000, expected: 300000, paidAgainstBills: 120000, collectionRate: 40, outstanding: 90000,
    trend: [{ month: "2026-09", label: "Sep 2026", amount: 100000 }, { month: "2026-10", label: "Oct 2026", amount: 150000 }],
    byMethod: [{ method: "BankTransfer", amount: 150000, receipts: 3 }],
    defaulterClasses: [{ classId: 4, label: "Class 5 – A", students: 6, amount: 42000 }],
    defaulterStudents: [{ studentId: 3, name: "Hamza Raza", classLabel: "Class 5 – A", months: 3, amount: 12000 }],
    advanceCredit: { students: 2, amount: 4000 },
    recentPayments: [{ id: 7, receiptNo: "RCPT-7", date: "2026-10-30", method: "Cash", amount: 5000, studentName: "Ali Khan", classLabel: "Class 5 – A" }],
  },
  incomeVsExpenses: { income: 160000, expenses: 170000, net: -10000 },
  generation: { month: "2026-10", label: "Oct 2026", activeStudents: 10, billed: 8, notBilled: 2 },
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
    expect(svc.get).toHaveBeenCalledWith("month")
    const picker = screen.getByLabelText("Period")
    expect(within(picker).getAllByRole("radio").map((b) => b.textContent)).toEqual(["Session", "Monthly", "Weekly", "Daily"])
    fireEvent.click(within(picker).getByRole("radio", { name: "Weekly" }))
    await waitFor(() => expect(svc.get).toHaveBeenCalledWith("week"))
    expect(await screen.findByText("Outstanding dues")).toBeTruthy()
    expect(screen.getByText("Outstanding dues")).toBeTruthy()
    expect(screen.getByTestId("dash-net").textContent).toContain("-10,000")
    expect(screen.getByTestId("pending-concessions").textContent).toBe("2")
    expect(screen.getByText("Class 9 – B has no fee structure")).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Record expense" })).toBeNull()
    fireEvent.click(screen.getByText("Concession approvals"))
    expect(onOpen).toHaveBeenCalledWith("fees")
  })

  it("lays out the owner view: trends, only non-empty approvals, no bill generation card", async () => {
    grantRoleDefaults("super_admin")
    svc.get.mockResolvedValue(payload(ADMIN))
    mount()
    expect((await screen.findByTestId("kpi-collected")).textContent).toContain("50% vs last month")
    expect(screen.getByTestId("kpi-student-absence").textContent).toContain("50% vs last school day")
    expect(screen.getByTestId("kpi-pending").textContent).toContain("3")
    expect(screen.queryByTestId("pending-adjustments")).toBeNull()
    expect(screen.queryByTestId("dash-not-billed")).toBeNull()
    expect(screen.getByText("Hamza Raza")).toBeTruthy()
    expect(screen.getByText("1 uncovered")).toBeTruthy()
  })

  it("shows all-clear states when the owner has nothing waiting", async () => {
    grantRoleDefaults("super_admin")
    const finance = ADMIN.finance
    if (!finance) throw new Error("fixture needs finance")
    svc.get.mockResolvedValue(payload({ ...ADMIN, pending: { concessions: 0 }, absentTeachers: [], alerts: { classesWithoutFeeStructure: [], failedImports: 0 }, finance: { ...finance, defaulterStudents: [] } }))
    mount()
    expect(await screen.findByText("All caught up.")).toBeTruthy()
    expect(screen.getByText("Every teacher is in today.")).toBeTruthy()
    expect(screen.getByText("No alerts. All set up.")).toBeTruthy()
    expect(screen.getByText("No student owes anything.")).toBeTruthy()
  })

  it("renders only what the Operations Manager's payload holds, with no money", async () => {
    grantRoleDefaults("operations_manager")
    svc.get.mockResolvedValue(payload({ students: { active: 120 }, attendance: ATTENDANCE, feeStatus: { month: "2026-10", label: "Oct 2026", cleared: 80, notCleared: 40 } }))
    mount()
    expect(await screen.findByTestId("dash-fee-status")).toBeTruthy()
    expect(screen.queryByText(/PKR/)).toBeNull()
    expect(screen.queryByLabelText("Period")).toBeNull()
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
    expect(screen.queryByRole("link", { name: "Collect fee" })).toBeNull()
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

  it("computes trend changes only against a real base", () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(5, 0)).toBeNull()
    expect(pointBefore([{ date: "2026-10-28" }, { date: "2026-10-29" }, { date: "2026-10-30" }], "2026-10-30")?.date).toBe("2026-10-29")
    expect(pointBefore([{ date: "2026-10-30" }], "2026-10-30")).toBeUndefined()
  })
})
