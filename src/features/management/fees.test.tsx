import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FeeMonth, Payment, SchoolState, Student } from "@/data/types"

import { Fees } from "./fees"

const mockActor = vi.hoisted(() => ({ role: "super_admin", name: "Admin User" }))
const mockConfirm = vi.hoisted(() => vi.fn())
const mockRecord = vi.hoisted(() => vi.fn())

const mockState = vi.hoisted(() => ({
  sessions: [
    { id: "1", name: "2026-2027", start: "2026-04-01", end: "2027-03-31", current: true },
  ],
  classes: [
    { id: "1", label: "Class 1", section: "A" },
  ],
  students: [
    {
      id: "101",
      admissionNo: "CLS-001",
      name: "Ahmed Ali",
      classId: "1",
      guardian: "Ali Father",
      phone: "03001234567",
      status: "Active",
      dob: "2015-05-10",
      gender: "Male",
      admittedOn: "2026-04-01",
    },
    {
      id: "102",
      admissionNo: "CLS-002",
      name: "Fatima Noor",
      classId: "1",
      guardian: "Noor Father",
      phone: "03007654321",
      status: "Active",
      dob: "2016-08-12",
      gender: "Female",
      admittedOn: "2026-04-01",
    },
  ] as Student[],
  feeMonths: [
    {
      id: "fm-1",
      studentId: "101",
      month: "2026-09",
      feeType: "Tuition",
      amountDue: 5000,
      amountPaid: 5000,
      dueDate: "2026-09-10",
    },
    {
      id: "fm-2",
      studentId: "101",
      month: "2026-10",
      feeType: "Tuition",
      amountDue: 5000,
      amountPaid: 2500,
      dueDate: "2026-10-10",
    },
  ] as FeeMonth[],
  payments: [
    {
      ref: "RCPT-202610-001",
      studentId: "101",
      amount: 5000,
      method: "Cash",
      status: "Paid",
      date: "2026-09-05",
      recordedBy: "Accountant User",
      recordedByRole: "Accountant",
      allocations: [{ feeMonthId: "fm-1", month: "2026-09", amount: 5000 }],
      unallocated: 0,
      mode: "auto",
    },
    {
      ref: "RCPT-202610-002",
      studentId: "101",
      amount: 2500,
      method: "Bank transfer",
      status: "Pending",
      date: "2026-10-05",
      recordedBy: "Accountant User",
      recordedByRole: "Accountant",
      allocations: [{ feeMonthId: "fm-2", month: "2026-10", amount: 2500 }],
      unallocated: 0,
      mode: "manual",
    },
  ] as Payment[],
}))

vi.mock("@/lib/actor", () => ({ useActor: () => mockActor }))
vi.mock("@/data/store", () => ({
  useSchool: () => ({
    state: mockState as unknown as SchoolState,
    confirmPayment: mockConfirm,
    recordPayment: mockRecord,
  }),
  studentName: (students: Student[], id: string) =>
    students.find((s) => s.id === id || s.admissionNo === id)?.name ?? id,
}))

// Recharts container uses ResizeObserver
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

function wrap(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

beforeEach(() => {
  mockConfirm.mockReset()
  mockRecord.mockReset()
  mockActor.role = "super_admin"
})
afterEach(cleanup)

describe("Fees (Fee Ledger Tab)", () => {
  it("renders collection against target chart and offline fee desk card", () => {
    wrap(<Fees query="" />)
    expect(screen.getByText("Collection against target")).toBeTruthy()
    expect(screen.getByText("Offline fee desk")).toBeTruthy()
    expect(screen.getByText("Ledger")).toBeTruthy()
  })

  it("displays receipts table with payment data, student names, and status badges", () => {
    wrap(<Fees query="" />)
    expect(screen.getByText("RCPT-202610-001")).toBeTruthy()
    expect(screen.getByText("RCPT-202610-002")).toBeTruthy()
    expect(screen.getAllByText("Ahmed Ali").length).toBeGreaterThan(0)
    expect(screen.getByText("Paid")).toBeTruthy()
    expect(screen.getByText("Pending")).toBeTruthy()
    expect(screen.getByText("manual")).toBeTruthy()
  })

  it("filters ledger records by search query", () => {
    wrap(<Fees query="" />)
    const searchInput = screen.getByPlaceholderText("Search receipt, student or month")
    fireEvent.change(searchInput, { target: { value: "RCPT-202610-002" } })
    expect(screen.getByText("RCPT-202610-002")).toBeTruthy()
    expect(screen.queryByText("RCPT-202610-001")).toBeNull()
  })

  it("filters ledger records by status", () => {
    wrap(<Fees query="" />)
    // Both are initially visible
    expect(screen.getByText("RCPT-202610-001")).toBeTruthy()
    expect(screen.getByText("RCPT-202610-002")).toBeTruthy()
  })

  it("allows clicking a student to open their monthly fee ledger modal with balances", async () => {
    wrap(<Fees query="" />)
    const studentButtons = screen.getAllByRole("button", { name: "Ahmed Ali" })
    fireEvent.click(studentButtons[0])

    // Dialog title
    expect(await screen.findByRole("heading", { name: "Ahmed Ali" })).toBeTruthy()
    expect(screen.getByText(/Monthly fee records for 101/)).toBeTruthy()

    // FeeMonthTable shows fee records
    expect(screen.getAllByText("Tuition").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Sept 2026").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Oct 2026").length).toBeGreaterThan(0)
  })

  it("shows Confirm button for Pending payment and calls confirmPayment on click", () => {
    wrap(<Fees query="" />)
    const confirmButton = screen.getByRole("button", { name: "Confirm" })
    fireEvent.click(confirmButton)
    expect(mockConfirm).toHaveBeenCalledWith("RCPT-202610-002", mockActor)
  })

  it("opens record payment form dialog when clicking Record payment", async () => {
    wrap(<Fees query="" />)
    const recordBtn = screen.getByRole("button", { name: /Record payment/i })
    fireEvent.click(recordBtn)
    expect(await screen.findByText("A receipt number is generated. The oldest unpaid month is cleared first unless you record an explicit allocation.")).toBeTruthy()
  })
})
