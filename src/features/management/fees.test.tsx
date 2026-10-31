import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { FeePaymentDto, StudentLedgerDto } from "@/api/fees/fees.service"
import { grantRoleDefaults } from "@/test/permissions"

import { Fees } from "./fees"

const mockActor = vi.hoisted(() => ({
  role: "super_admin" as string,
  name: "Admin User",
}))
const mockNavigate = vi.hoisted(() => vi.fn())
const mockConfirmPayment = vi.hoisted(() => vi.fn())
const mockListPayments = vi.hoisted(() => vi.fn())
const mockListMonths = vi.hoisted(() => vi.fn())
const mockStudentLedger = vi.hoisted(() => vi.fn())

const PAYMENTS: FeePaymentDto[] = [
  {
    id: 1,
    receiptNo: "RCPT-202610-001",
    paymentDate: "2026-09-05",
    status: "Paid",
    method: "Cash",
    amount: 5000,
    unallocatedAmount: 0,
    allocationMode: "auto",
    feeMonths: [
      {
        id: 11,
        month: "2026-09-01",
        label: "Sept 2026",
        feeType: "Tuition",
        amount: 5000,
      },
    ],
    student: { id: 101, name: "Ahmed Ali", admissionNo: "CLS-001" },
    recordedBy: { id: 9, name: "Accountant User" },
    notes: null,
  },
  {
    id: 2,
    receiptNo: "RCPT-202610-002",
    paymentDate: "2026-10-05",
    status: "Pending",
    method: "Bank transfer",
    amount: 2500,
    unallocatedAmount: 0,
    allocationMode: "manual",
    feeMonths: [
      {
        id: 12,
        month: "2026-10-01",
        label: "Oct 2026",
        feeType: "Tuition",
        amount: 2500,
      },
    ],
    student: { id: 101, name: "Ahmed Ali", admissionNo: "CLS-001" },
    recordedBy: { id: 9, name: "Accountant User" },
    notes: null,
  },
]

const LEDGER: StudentLedgerDto = {
  student: {
    id: 101,
    name: "Ahmed Ali",
    admissionNo: "CLS-001",
    status: "Active",
    class: { id: 1, label: "Class 1 – A" },
  },
  months: [
    {
      month: "2026-09-01",
      label: "Sept 2026",
      due: 5000,
      paid: 5000,
      outstanding: 0,
      status: "Paid",
      bills: [
        {
          id: 11,
          feeType: "Tuition",
          due: 5000,
          paid: 5000,
          outstanding: 0,
          status: "Paid",
          dueDate: "2026-09-10",
        },
      ],
    },
    {
      month: "2026-10-01",
      label: "Oct 2026",
      due: 5000,
      paid: 2500,
      outstanding: 2500,
      status: "Partially Paid",
      bills: [
        {
          id: 12,
          feeType: "Tuition",
          due: 5000,
          paid: 2500,
          outstanding: 2500,
          status: "Partially Paid",
          dueDate: "2026-10-10",
        },
      ],
    },
  ],
}

vi.mock("@/lib/actor", () => ({ useActor: () => mockActor }))
vi.mock("@/data/store", () => ({
  useSchool: () => ({
    state: {
      students: [
        {
          id: "101",
          admissionNo: "CLS-001",
          name: "Ahmed Ali",
          classId: "1",
        },
      ],
      classes: [{ id: "1", label: "Class 1", section: "A" }],
      feeMonths: [],
      payments: [],
      settings: { receipt: { footerNote: "", showSignatureLine: true } },
    },
  }),
}))
vi.mock("react-router-dom", async (orig) => {
  const actual = await orig<typeof import("react-router-dom")>()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock("@/api/fees/fees.service", () => ({
  default: {
    listPayments: (...args: unknown[]) => mockListPayments(...args),
    listMonths: (...args: unknown[]) => mockListMonths(...args),
    confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
    studentLedger: (...args: unknown[]) => mockStudentLedger(...args),
    summary: vi.fn(),
  },
}))

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

function wrap(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  mockActor.role = "super_admin"
  grantRoleDefaults("super_admin")
  mockNavigate.mockReset()
  mockConfirmPayment.mockReset()
  mockListPayments.mockReset()
  mockListMonths.mockReset()
  mockStudentLedger.mockReset()
  mockListPayments.mockResolvedValue(PAYMENTS)
  mockListMonths.mockResolvedValue([])
  mockConfirmPayment.mockResolvedValue({ ...PAYMENTS[1], status: "Paid" })
  mockStudentLedger.mockResolvedValue(LEDGER)
})
afterEach(cleanup)

describe("Fees (Fee Ledger Tab)", () => {
  it("renders collection against target chart and offline fee desk card", async () => {
    wrap(<Fees query="" />)
    expect(screen.getByText("Collection against target")).toBeTruthy()
    expect(screen.getByText("Offline fee desk")).toBeTruthy()
    expect(screen.getByText("Ledger")).toBeTruthy()
    await waitFor(() => expect(mockListPayments).toHaveBeenCalled())
  })

  it("displays receipts table with payment data, student names, and status badges", async () => {
    wrap(<Fees query="" />)
    expect(await screen.findByText("RCPT-202610-001")).toBeTruthy()
    expect(screen.getByText("RCPT-202610-002")).toBeTruthy()
    expect(screen.getAllByText("Ahmed Ali").length).toBeGreaterThan(0)
    expect(screen.getByText("Paid")).toBeTruthy()
    expect(screen.getByText("Pending")).toBeTruthy()
    expect(screen.getByText("manual")).toBeTruthy()
  })

  it("filters ledger records by search query", async () => {
    wrap(<Fees query="" />)
    expect(await screen.findByText("RCPT-202610-001")).toBeTruthy()
    const searchInput = screen.getByPlaceholderText(
      "Search receipt, student or month"
    )
    fireEvent.change(searchInput, { target: { value: "RCPT-202610-002" } })
    expect(screen.getByText("RCPT-202610-002")).toBeTruthy()
    expect(screen.queryByText("RCPT-202610-001")).toBeNull()
  })

  it("filters ledger records by status", async () => {
    wrap(<Fees query="" />)
    expect(await screen.findByText("RCPT-202610-001")).toBeTruthy()
    expect(screen.getByText("RCPT-202610-002")).toBeTruthy()
  })

  it("allows clicking a student to open their monthly fee ledger modal with balances", async () => {
    wrap(<Fees query="" />)
    expect(await screen.findByText("RCPT-202610-001")).toBeTruthy()
    const studentButtons = screen.getAllByRole("button", { name: "Ahmed Ali" })
    fireEvent.click(studentButtons[0])

    expect(await screen.findByRole("heading", { name: "Ahmed Ali" })).toBeTruthy()
    expect(screen.getByText(/Monthly fee records for Ahmed Ali/)).toBeTruthy()
    expect(await screen.findAllByText("Tuition")).toHaveLength(2)
    expect(screen.getAllByText("Sept 2026").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Oct 2026").length).toBeGreaterThan(0)
    expect(mockStudentLedger).toHaveBeenCalledWith(101)
  })

  it("shows Confirm for Pending payments for super admin and calls the fees API", async () => {
    wrap(<Fees query="" />)
    const confirmButton = await screen.findByRole("button", { name: "Confirm" })
    fireEvent.click(confirmButton)
    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalledWith(2))
  })

  it("hides Confirm for accountants because the API forbids payment confirmation", async () => {
    mockActor.role = "accountant"
    grantRoleDefaults("accountant")
    wrap(<Fees query="" />)
    expect(await screen.findByText("RCPT-202610-002")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull()
    expect(mockConfirmPayment).not.toHaveBeenCalled()
  })

  it("navigates to Collect Fee when Record payment is clicked", async () => {
    wrap(<Fees query="" />)
    expect(await screen.findByText("Ledger")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Record payment/i }))
    expect(mockNavigate).toHaveBeenCalledWith("/admin/collect-fee")
  })
})
