import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FeeStructure } from "@/api/fees/fee-structure.service"

import { AddFeeDialog, RemoveFeeDialog } from "./fee-structure-dialogs"
import { FeeStructurePage } from "./fee-structure-page"
import { amountError, nextMonthStart } from "./fee-structure-rules"

const svc = vi.hoisted(() => ({ get: vi.fn(), history: vi.fn(), add: vi.fn(), remove: vi.fn() }))
const actor = vi.hoisted(() => ({ role: "super_admin" }))

vi.mock("@/api/fees/fee-structure.service", async (orig) => ({
  ...(await orig<typeof import("@/api/fees/fee-structure.service")>()),
  default: svc,
}))
vi.mock("@/lib/actor", () => ({ useActor: () => ({ role: actor.role, name: "Test" }) }))
vi.mock("@/features/management/sessions/hooks/use-sessions", () => ({
  useSessionsList: () => ({
    data: [{ id: "1", name: "2026–2027", start: "2026-04-01", end: "2027-03-31", current: true }],
    isPending: false,
    error: null,
  }),
}))
vi.mock("@/features/management/classes/hooks/use-classes", () => ({
  useClassesList: () => ({ data: [{ id: "7", label: "Class 1 – A" }], isPending: false, error: null }),
}))

const STRUCTURE: FeeStructure = {
  class: { id: 7, label: "Class 1 – A", sessionId: 1, sessionName: "2026–2027" },
  asOf: "2026-10-24",
  fees: [
    { id: 1, feeType: "Tuition", frequency: "Monthly", amount: 2500, effectiveFrom: "2026-04-01" },
    { id: 2, feeType: "Admission", frequency: "OneTime", amount: 5000, effectiveFrom: "2026-04-01" },
  ],
  upcoming: [{ id: 3, feeType: "Tuition", frequency: "Monthly", amount: 2800, effectiveFrom: "2026-11-01" }],
  monthlyTotal: 2500,
  otherTotal: 5000,
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  actor.role = "super_admin"
  Object.values(svc).forEach((fn) => fn.mockReset())
})
afterEach(cleanup)

describe("amount and date helpers", () => {
  it.each([
    ["", "Enter an amount."],
    ["0", "Amount must be greater than 0."],
    ["-5", "Use a number with at most 2 decimal places."],
    ["12.345", "Use a number with at most 2 decimal places."],
    ["abc", "Use a number with at most 2 decimal places."],
    ["99999999999", "Amount is too large."],
  ])("rejects %j", (raw, message) => expect(amountError(raw)).toBe(message))

  it("accepts whole and 2-decimal amounts", () => {
    expect(amountError("2500")).toBeNull()
    expect(amountError("2500.50")).toBeNull()
  })

  it("defaults the effective date to the next month start", () => {
    expect(nextMonthStart(new Date(2026, 9, 24))).toBe("2026-11-01")
    expect(nextMonthStart(new Date(2026, 11, 5))).toBe("2027-01-01")
  })
})

describe("AddFeeDialog", () => {
  it("validates, then submits a typed payload and shows server errors inline", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Tuition already has an amount starting 2026-11-01."))
    wrap(
      <AddFeeDialog open onOpenChange={() => {}} classLabel="Class 1 – A" current={STRUCTURE.fees} initialType="Tuition" saving={false} onSubmit={onSubmit} />
    )
    expect(screen.getByText(/will affect all students in/i).textContent).toContain("Class 1 – A")
    expect(screen.getByText(/Currently PKR 2,500/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Save new amount" }))
    expect(await screen.findByText("Enter an amount.")).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Amount \(PKR\)/), { target: { value: "2800" } })
    fireEvent.click(screen.getByRole("button", { name: "Save new amount" }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ feeType: "Tuition", amount: 2800, effectiveFrom: nextMonthStart() })
    )
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Tuition already has an amount starting 2026-11-01.")
  })

  it("requires a fee type", async () => {
    const onSubmit = vi.fn()
    wrap(<AddFeeDialog open onOpenChange={() => {}} classLabel="X" current={[]} saving={false} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole("button", { name: "Add fee type" }))
    expect(await screen.findByText("Choose a fee type.")).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe("RemoveFeeDialog", () => {
  it("needs a reason of 5+ characters and notes the audit log", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    wrap(<RemoveFeeDialog fee={STRUCTURE.fees[1]} classLabel="Class 1 – A" saving={false} onClose={() => {}} onConfirm={onConfirm} />)
    expect(screen.getByText("This reason will be recorded in the Audit Log.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Remove fee" }))
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "  No admission fee this year  " } })
    fireEvent.click(screen.getByRole("button", { name: "Remove fee" }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("No admission fee this year"))
  })
})

describe("FeeStructurePage", () => {
  it("shows the banner total, separates other fees and the scheduled change", async () => {
    svc.get.mockResolvedValue(STRUCTURE)
    wrap(<FeeStructurePage />)
    expect((await screen.findByTestId("monthly-total")).textContent).toBe("PKR 2,500")
    expect(screen.getByTestId("table-total").textContent).toBe("2,500")
    expect(screen.getByText(/Billed separately/)).toBeTruthy()
    expect(screen.getByText(/2,800 from 1 Nov 2026/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Add Fee Type/ })).toBeTruthy()
    expect(svc.get).toHaveBeenCalledWith(7)
  })

  it("opens history with the latest amount marked Current", async () => {
    svc.get.mockResolvedValue(STRUCTURE)
    svc.history.mockResolvedValue({
      feeType: "Tuition",
      entries: [
        { ...STRUCTURE.upcoming[0], status: "Scheduled", addedAt: "", addedBy: "Admin", removedAt: null, removedBy: null, removedReason: null },
        { ...STRUCTURE.fees[0], status: "Current", addedAt: "", addedBy: "Admin", removedAt: null, removedBy: null, removedReason: null },
      ],
    })
    wrap(<FeeStructurePage />)
    await screen.findByTestId("monthly-total")
    fireEvent.click(screen.getAllByRole("button", { name: /History Tuition/ })[0])
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("History — Tuition")).toBeTruthy()
    expect(await within(dialog).findByText("Current")).toBeTruthy()
    expect(within(dialog).getAllByText(/Effective date/).length).toBe(2)
  })

  it("is read-only for the Accountant", async () => {
    actor.role = "accountant"
    svc.get.mockResolvedValue(STRUCTURE)
    wrap(<FeeStructurePage />)
    await screen.findByTestId("monthly-total")
    expect(screen.queryByRole("button", { name: /Add Fee Type/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull()
    expect(screen.getByText(/Read only/)).toBeTruthy()
  })

  it("shows the empty and error states", async () => {
    svc.get.mockResolvedValueOnce({ ...STRUCTURE, fees: [], upcoming: [], monthlyTotal: 0, otherTotal: 0 })
    wrap(<FeeStructurePage />)
    expect(await screen.findByText("No fees set for this class")).toBeTruthy()
    cleanup()
    svc.get.mockRejectedValueOnce(new Error("Network down"))
    wrap(<FeeStructurePage />)
    expect(await screen.findByText("Couldn't load the fee structure")).toBeTruthy()
    expect(screen.getByText("Network down")).toBeTruthy()
  })
})
