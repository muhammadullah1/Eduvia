import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FeeReport } from "@/api/fees/fee-reports.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"

import { FeeReportsPanel } from "./fee-reports"

const svc = vi.hoisted(() => ({ get: vi.fn(), download: vi.fn() }))
const print = vi.hoisted(() => vi.fn(() => true))
vi.mock("@/api/fees/fee-reports.service", async (orig) => ({
  ...(await orig<typeof import("@/api/fees/fee-reports.service")>()),
  default: svc,
}))
vi.mock("@/data/store", () => ({ useSchool: () => ({ state: { classes: [{ id: "7", label: "Class 1 – A" }] } }) }))
vi.mock("@/lib/print", () => ({ printDocument: print }))

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

const ALL = ["daily", "monthly", "class-wise", "student-wise", "outstanding", "advance", "defaulters"] as const

const report = (kind: string, rows: number, summary: FeeReport["summary"] = [["Students", rows]]): FeeReport => ({
  title: `${kind} report`,
  filename: kind,
  meta: [["Month", "Sep 2026"], ["Class", "All classes"], ["Note", "n"]],
  columns: [
    { key: "name", label: "Student" },
    { key: "amount", label: "Outstanding (PKR)", type: "money" },
    { key: "rate", label: "Collection %", type: "percent" },
  ],
  rows: Array.from({ length: rows }, (_, i) => ({ name: `Student ${i + 1}`, amount: 1000 * (i + 1), rate: 33.3 })),
  summary,
})

function wrap(node: ReactNode, initialEntries = ["/admin/fees?tab=reports"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset())
  print.mockClear()
  svc.get.mockImplementation((kind: string) => Promise.resolve(report(kind, 12)))
})
afterEach(cleanup)

describe("FeeReportsPanel", () => {
  it("shows the six Figma sub-tabs and opens Daily Collection on today's receipts", async () => {
    wrap(<FeeReportsPanel kinds={[...ALL]} />)
    const tabs = within(screen.getByRole("tablist", { name: "Fee reports" })).getAllByRole("tab")
    expect(tabs.map((t) => t.textContent)).toEqual(["Daily Collection", "Monthly Summary", "Class-wise", "Student-wise", "Outstanding / Advance", "Defaulters"])
    await waitFor(() => expect(svc.get).toHaveBeenCalledWith("daily", expect.objectContaining({ classId: "all" })))
    expect(await screen.findByText("Student 1")).toBeTruthy()
  })

  it("other tabs wait for Generate Report, then page 10 rows at a time", async () => {
    wrap(<FeeReportsPanel kinds={[...ALL]} />)
    fireEvent.click(screen.getByRole("tab", { name: "Defaulters" }))
    expect(screen.getByTestId("fee-report-empty").textContent).toContain("Apply filters and click Generate Report")
    expect(svc.get).not.toHaveBeenCalledWith("defaulters", expect.anything())
    fireEvent.click(screen.getAllByRole("button", { name: /Generate Report/ })[0])
    await screen.findByText("Student 1")
    expect(svc.get).toHaveBeenCalledWith("defaulters", expect.objectContaining({ month: expect.stringMatching(/^\d{4}-\d{2}$/) }))
    expect(screen.queryByText("Student 11")).toBeNull() // page 1 shows 10 of 12
    expect(screen.getByText("Student 10")).toBeTruthy()
    expect(screen.getAllByText("33.3%").length).toBeGreaterThan(0)
  })

  it("Outstanding / Advance switches between the two reports", async () => {
    wrap(<FeeReportsPanel kinds={[...ALL]} />)
    fireEvent.click(screen.getByRole("tab", { name: "Outstanding / Advance" }))
    const inner = screen.getByRole("tablist", { name: "Report view" })
    expect(within(inner).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Outstanding", "Advance & credit"])
    fireEvent.click(within(inner).getByRole("tab", { name: "Advance & credit" }))
    fireEvent.click(screen.getAllByRole("button", { name: /Generate Report/ })[0])
    await waitFor(() => expect(svc.get).toHaveBeenCalledWith("advance", expect.anything()))
  })

  it("exports and prints the generated report (all rows, with totals)", async () => {
    svc.download.mockResolvedValue(undefined)
    wrap(<FeeReportsPanel kinds={[...ALL]} />)
    await screen.findByText("Student 1")
    fireEvent.click(screen.getByRole("button", { name: /Excel/ }))
    await waitFor(() => expect(svc.download).toHaveBeenCalledWith("daily", expect.anything(), "xlsx"))
    fireEvent.click(screen.getByRole("button", { name: /Print/ }))
    const call = print.mock.calls[0] as unknown as [string, string[], { columns: string[]; rows: string[][] }]
    expect(call[0]).toBe("daily report")
    expect(call[1]).toContain("Students: 12")
    expect(call[2].rows).toHaveLength(12)
    expect(call[2].rows[0]).toEqual(["Student 1", "1,000", "33.3%"])
  })

  it("accountant: no tabs, no summary cards, own-receipts wording", async () => {
    svc.get.mockResolvedValue(report("daily", 2, null))
    wrap(<FeeReportsPanel kinds={["daily"]} />)
    await screen.findByText("Student 1")
    expect(screen.queryByRole("tablist", { name: "Fee reports" })).toBeNull()
    expect(screen.queryByLabelText("Summary")).toBeNull()
    expect(screen.getByText(/Receipts you recorded/)).toBeTruthy()
  })

  it("opens directly on subtab from URL query param", async () => {
    wrap(<FeeReportsPanel kinds={[...ALL]} />, ["/admin/fees?tab=reports&subtab=class-wise"])
    const tabs = within(screen.getByRole("tablist", { name: "Fee reports" })).getAllByRole("tab")
    const activeTab = tabs.find((t) => t.getAttribute("aria-selected") === "true")
    expect(activeTab?.textContent).toBe("Class-wise")
  })
})

describe("ClsSubTabs wrap", () => {
  it("wraps into a grid instead of a horizontal scroller", () => {
    render(<ClsSubTabs wrap aria-label="T" value="a" onValueChange={() => {}} items={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} />)
    const list = screen.getByRole("tablist", { name: "T" })
    expect(list.className).toContain("grid-cols-2")
    expect(list.className).not.toContain("overflow-x-auto")
  })
})
