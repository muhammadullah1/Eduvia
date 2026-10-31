import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CollectContext, ServerReceipt } from "@/api/fees/collect.service"
import { grantRoleDefaults } from "@/test/permissions"

import { CollectFeePage } from "./collect-fee-page"
import { allocationRows, amountError, canApplyCredit, receiptPrintRows } from "./collect-rules"

const svc = vi.hoisted(() => ({ overview: vi.fn(), search: vi.fn(), context: vi.fn(), preview: vi.fn(), record: vi.fn() }))
const actor = vi.hoisted(() => ({ role: "super_admin" }))
const sync = vi.hoisted(() => vi.fn())

vi.mock("@/api/fees/collect.service", async (orig) => ({
  ...(await orig<typeof import("@/api/fees/collect.service")>()),
  default: svc,
}))
vi.mock("@/lib/actor", () => ({ useActor: () => ({ role: actor.role, name: "Test" }) }))
vi.mock("@/data/store", () => ({ useSchool: () => ({ syncPortalForRoute: sync, state: { settings: { receipt: { footerNote: "", showSignatureLine: true } } } }) }))
vi.mock("@/features/management/screens", () => ({ StudentLedgerView: () => <div>ledger view</div> }))

const CTX: CollectContext = {
  student: { id: 11, name: "Ali Khan", admissionNo: "A-101", status: "Active", class: { id: 7, label: "Class 1 – A" } },
  openBills: [
    { id: 1, month: "2026-09", label: "Sep 2026", feeType: "Tuition", amountDue: 2500, amountPaid: 1000, balance: 1500, status: "Partially Paid", dueDate: null },
    { id: 2, month: "2026-10", label: "Oct 2026", feeType: "Tuition", amountDue: 2500, amountPaid: 0, balance: 2500, status: "Unpaid", dueDate: null },
  ],
  outstanding: 4000,
  creditBalance: 600,
  creditHistory: [{ id: 5, date: "2026-10-01T10:00:00Z", type: "Credit", source: "payment", amount: 600, balanceAfter: 600, receiptNo: "RCPT-1", paymentId: 3, feeMonth: null, notes: null }],
  recentReceipts: [],
}

const ALLOC: ServerReceipt = {
  id: null, receiptNo: null, paymentDate: "2026-10-24", status: "Paid", method: "Cash", amount: 4000, unallocatedAmount: 600, allocationMode: "Auto",
  feeMonths: [
    { id: 1, month: "2026-09", label: "Sep 2026", feeType: "Tuition", amount: 900 },
    { id: 2, month: "2026-10", label: "Oct 2026", feeType: "Tuition", amount: 2500 },
  ],
  student: { id: 11, name: "Ali Khan", admissionNo: "A-101" }, recordedBy: { id: 1, name: "Admin" }, notes: null,
  creditApplied: [{ feeMonthId: 1, month: "2026-09", label: "Sep 2026", feeType: "Tuition", amount: 600 }],
  creditAppliedTotal: 600, creditAdded: 600, creditBalance: 600,
}

// Radix Switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => {
  actor.role = "super_admin"
  grantRoleDefaults("super_admin")
  Object.values(svc).forEach((fn) => fn.mockReset())
  sync.mockReset()
  svc.overview.mockResolvedValue({ date: "2026-10-24", totalStudents: 10, withOutstanding: 3, todayCollection: { receipts: 0, amount: 0 } })
  svc.search.mockResolvedValue([{ id: 11, name: "Ali Khan", admissionNo: "A-101", status: "Active", class: { id: 7, label: "Class 1 – A" }, outstanding: 4000, openBills: 2, creditBalance: 600 }])
  svc.context.mockResolvedValue(CTX)
})
afterEach(cleanup)

describe("collect rules", () => {
  it("validates the amount", () => {
    expect(amountError("")).toMatch(/Enter/)
    expect(amountError("-5")).toMatch(/positive/)
    expect(amountError("0")).toMatch(/more than zero/)
    expect(amountError("12.345")).toMatch(/2 decimals/)
    expect(amountError("2500.50")).toBeNull()
  })
  it("offers credit only when there is credit and an open bill", () => {
    expect(canApplyCredit(CTX)).toBe(true)
    expect(canApplyCredit({ ...CTX, openBills: [] })).toBe(false)
    expect(canApplyCredit({ ...CTX, creditBalance: 0 })).toBe(false)
  })
  it("orders allocation rows: credit, cash months, then new credit; the receipt adds the total", () => {
    expect(allocationRows(ALLOC).map((r) => [r.kind, r.label, r.amount])).toEqual([
      ["credit", "Sep 2026", 600], ["cash", "Sep 2026", 900], ["cash", "Oct 2026", 2500], ["to-credit", "Added to credit", 600],
    ])
    expect(receiptPrintRows(ALLOC).at(-1)).toEqual(["Amount received", "Cash", "4,000"])
  })
})

describe("CollectFeePage", () => {
  it("shows the Figma stat cards; Today's Collection only for the super admin", async () => {
    wrap(<CollectFeePage />)
    expect(await screen.findByText("Total Students")).toBeTruthy()
    expect(screen.getByText("With Outstanding")).toBeTruthy()
    expect(screen.getByText("Today's Collection")).toBeTruthy()
    expect(screen.getByPlaceholderText(/Search by student name/)).toBeTruthy()
  })

  it("accountant never sees a school-wide total", async () => {
    actor.role = "accountant"
    grantRoleDefaults("accountant")
    svc.overview.mockResolvedValue({ date: "2026-10-24", totalStudents: 10, withOutstanding: 3, myCollectionToday: { receipts: 2, amount: 5000 } })
    wrap(<CollectFeePage />)
    expect(await screen.findByText("My Receipts Today")).toBeTruthy()
    expect(screen.queryByText("Today's Collection")).toBeNull()
  })

  it("does not search below 2 characters", async () => {
    wrap(<CollectFeePage />)
    fireEvent.change(screen.getByPlaceholderText(/Search by student name/), { target: { value: "A" } })
    await new Promise((r) => setTimeout(r, 350))
    expect(svc.search).not.toHaveBeenCalled()
  })

  it("search → bills and credit → preview → confirm → receipt, with one idempotency key", async () => {
    svc.preview.mockResolvedValue({ preview: true, allocation: ALLOC })
    svc.record.mockResolvedValue({ duplicate: false, receipt: { ...ALLOC, id: 9, receiptNo: "RCPT-20261024-ABC" } })
    wrap(<CollectFeePage />)
    fireEvent.change(screen.getByPlaceholderText(/Search by student name/), { target: { value: "Ali" } })
    fireEvent.click(await screen.findByRole("option", { name: /Ali Khan/ }))
    expect(await screen.findByTestId("collect-student")).toBeTruthy()
    expect(screen.getAllByText("Sep 2026").length).toBeGreaterThan(0)
    expect(screen.getByTestId("credit-chip").textContent).toContain("600")

    fireEvent.click(screen.getByRole("button", { name: /Preview allocation/ }))
    expect(await screen.findByText("Enter the amount received.")).toBeTruthy()
    expect(svc.preview).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Amount received/), { target: { value: "4000" } })
    fireEvent.click(screen.getByRole("button", { name: /Preview allocation/ }))
    expect(await screen.findByTestId("allocation-preview")).toBeTruthy()
    const sent = svc.preview.mock.calls[0][0]
    expect(sent).toMatchObject({ studentId: 11, amount: 4000, method: "Cash", applyCredit: true })
    expect(screen.getByText("Added to credit")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Confirm & record/ }))
    expect(await screen.findByTestId("receipt-card")).toBeTruthy()
    expect(screen.getByText("RCPT-20261024-ABC")).toBeTruthy()
    expect(svc.record.mock.calls[0][0].idempotencyKey).toBe(sent.idempotencyKey)
    await waitFor(() => expect(sync).toHaveBeenCalledWith("super_admin", "collect-fee"))
  })

  it("credit can be switched off and server errors are shown", async () => {
    svc.preview.mockRejectedValue(new Error("Student not found"))
    wrap(<CollectFeePage />)
    fireEvent.change(screen.getByPlaceholderText(/Search by student name/), { target: { value: "A-1" } })
    fireEvent.click(await screen.findByRole("option", { name: /Ali Khan/ }))
    await screen.findByTestId("collect-student")
    fireEvent.click(screen.getByRole("switch", { name: /Apply credit balance/ }))
    fireEvent.change(screen.getByLabelText(/Amount received/), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: /Preview allocation/ }))
    expect(await screen.findByText("Student not found")).toBeTruthy()
    expect(svc.preview.mock.calls[0][0].applyCredit).toBe(false)
  })
})
