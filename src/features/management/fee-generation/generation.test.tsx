import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { GenerationResult, StudentLedger } from "@/api/fees/generation.service"

import { MonthlyGenerationPage } from "./generation-page"
import { currentMonthKey, extrasSummary, monthTitle, statusTone } from "./generation-rules"
import { StudentLedgerView } from "./student-ledger"

const svc = vi.hoisted(() => ({ preview: vi.fn(), generate: vi.fn(), ledger: vi.fn() }))
const actor = vi.hoisted(() => ({ role: "super_admin" }))

vi.mock("@/api/fees/generation.service", async (orig) => ({
  ...(await orig<typeof import("@/api/fees/generation.service")>()),
  default: svc,
}))
vi.mock("@/lib/actor", () => ({ useActor: () => ({ role: actor.role, name: "Test" }) }))
vi.mock("@/features/management/sessions/hooks/use-sessions", () => ({
  useSessionsList: () => ({ data: [{ id: "1", name: "2026–2027", current: true }], isPending: false, error: null }),
}))
vi.mock("@/features/management/classes/hooks/use-classes", () => ({
  useClassesList: () => ({ data: [{ id: "7", label: "Class 1 – A" }], isPending: false, error: null }),
}))

const RESULT: GenerationResult = {
  month: "2026-10",
  label: "October 2026",
  classId: null,
  dryRun: true,
  students: 3,
  classes: [
    {
      classId: 7, label: "Class 1 – A", students: 3, billedStudents: 3, skippedStudents: 0, bills: 4,
      totalDue: 7500, outstandingCarried: 1200, byType: { Tuition: { bills: 3, amount: 7500 }, Exam: { bills: 1, amount: 0 } }, sampleStudentId: 11,
    },
  ],
  totals: { students: 3, billedStudents: 3, skippedStudents: 0, bills: 4, totalDue: 7500, outstandingCarried: 1200 },
}

const LEDGER: StudentLedger = {
  student: { id: 11, name: "Ali Khan", admissionNo: "A-101", status: "Active", class: { id: 7, label: "Class 1 – A" } },
  months: [
    { month: "2026-09", label: "Sep 2026", due: 3000, paid: 3000, outstanding: 0, status: "Paid", bills: [
      { id: 1, feeType: "Tuition", due: 2500, paid: 2500, outstanding: 0, status: "Paid", dueDate: null },
      { id: 2, feeType: "Exam", due: 500, paid: 500, outstanding: 0, status: "Paid", dueDate: null },
    ] },
    { month: "2026-10", label: "Oct 2026", due: 2500, paid: 1000, outstanding: 1500, status: "Partially Paid", bills: [
      { id: 3, feeType: "Tuition", due: 2500, paid: 1000, outstanding: 1500, status: "Partially Paid", dueDate: null },
    ] },
  ],
  summary: { totalDue: 5500, totalPaid: 4000, outstanding: 1500, creditBalance: 200, netBalance: 1300, openMonths: 1 },
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{node}</QueryClientProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  actor.role = "super_admin"
  Object.values(svc).forEach((fn) => fn.mockReset())
})
afterEach(cleanup)

describe("generation helpers", () => {
  it("formats months and statuses", () => {
    expect(currentMonthKey(new Date(2026, 9, 24))).toBe("2026-10")
    expect(monthTitle("2026-10")).toBe("Oct 2026")
    expect(statusTone("Paid")).toBe("success")
    expect(statusTone("Partially Paid")).toBe("warning")
    expect(statusTone("Unpaid")).toBe("danger")
    expect(extrasSummary({ Tuition: { bills: 3 }, Annual: { bills: 2 }, Exam: { bills: 0 } })).toBe("Annual ×2")
  })
})

describe("MonthlyGenerationPage", () => {
  it("walks select → preview → confirm → generated with the same input", async () => {
    svc.preview.mockResolvedValue(RESULT)
    svc.generate.mockResolvedValue({ ...RESULT, dryRun: false })
    wrap(<MonthlyGenerationPage />)

    expect(screen.getByText(/Each student will receive one record for/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Preview Generation/ }))
    await screen.findByText(/Preview — /)
    expect(svc.preview).toHaveBeenCalledWith(expect.objectContaining({ month: currentMonthKey() }), expect.anything())
    expect(screen.getByTestId("preview-total").textContent).toBe("7,500")
    expect(screen.getAllByText("Sample Ledger").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Confirm Generation" }))
    expect(screen.getByText(/This action cannot be undone/)).toBeTruthy()
    expect(svc.generate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Generate Records" }))
    await screen.findByTestId("generated-summary")
    expect(svc.generate.mock.calls[0][0]).toEqual(svc.preview.mock.calls[0][0])
    expect(screen.getByTestId("generated-summary").textContent).toMatch(/created for 3 students \(4 records, PKR 7,500\)/)
    expect(screen.getByRole("button", { name: /Continue to Collection/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: "View Sample Ledger" })).toBeTruthy()
  })

  it("hides money for the Accountant and explains why", async () => {
    actor.role = "accountant"
    const strip = <T extends object>(o: T) =>
      Object.fromEntries(Object.entries(o).filter(([k]) => k !== "totalDue" && k !== "outstandingCarried"))
    svc.preview.mockResolvedValue({ ...RESULT, amountsHidden: true, totals: strip(RESULT.totals), classes: RESULT.classes.map(strip) })
    wrap(<MonthlyGenerationPage />)
    fireEvent.click(screen.getByRole("button", { name: /Preview Generation/ }))
    await screen.findByText(/visible to Super Admin only/)
    expect(screen.queryByTestId("preview-total")).toBeNull()
    expect(screen.queryByText(/Total due/i)).toBeNull()
  })

  it("disables confirm when everything is already billed", async () => {
    svc.preview.mockResolvedValue({ ...RESULT, totals: { ...RESULT.totals, bills: 0, billedStudents: 0, skippedStudents: 3 } })
    wrap(<MonthlyGenerationPage />)
    fireEvent.click(screen.getByRole("button", { name: /Preview Generation/ }))
    await screen.findByText(/nothing new to generate/)
    expect((screen.getByRole("button", { name: "Confirm Generation" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("shows missing fee-structure rows and blocks confirm when nothing else can bill", async () => {
    svc.preview.mockResolvedValue({
      ...RESULT,
      canConfirm: false,
      totals: { ...RESULT.totals, bills: 0, billedStudents: 0, missingStructureStudents: 3 },
      missingStructures: [
        {
          classId: 7,
          label: "Class 1 – A",
          feeType: "Tuition",
          studentCount: 3,
          message: "No fee structure for Class 1 – A / Tuition",
        },
      ],
    })
    wrap(<MonthlyGenerationPage />)
    fireEvent.click(screen.getByRole("button", { name: /Preview Generation/ }))
    expect(await screen.findByTestId("missing-fee-structures")).toBeTruthy()
    expect(screen.getByText(/No fee structure for Class 1 – A \/ Tuition/)).toBeTruthy()
    expect((screen.getByTestId("confirm-generation") as HTMLButtonElement).disabled).toBe(true)
  })

  it("shows a retryable error when the preview fails", async () => {
    svc.preview.mockRejectedValueOnce(new Error("Server unavailable"))
    wrap(<MonthlyGenerationPage />)
    fireEvent.click(screen.getByRole("button", { name: /Preview Generation/ }))
    await screen.findByText("Server unavailable")
    svc.preview.mockResolvedValue(RESULT)
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }))
    await screen.findByText(/Preview — /)
  })

  it("opens a sample ledger and comes back", async () => {
    svc.preview.mockResolvedValue(RESULT)
    svc.ledger.mockResolvedValue(LEDGER)
    wrap(<MonthlyGenerationPage />)
    fireEvent.click(screen.getByRole("button", { name: /Preview Generation/ }))
    await screen.findByText(/Preview — /)
    fireEvent.click(screen.getAllByText("Sample Ledger")[0])
    await screen.findByText("Monthly Ledger — Ali Khan")
    expect(svc.ledger).toHaveBeenCalledWith(11)
    fireEvent.click(screen.getByRole("button", { name: /Back to Generation/ }))
    await waitFor(() => expect(screen.getByText(/Preview — /)).toBeTruthy())
  })
})

describe("StudentLedgerView", () => {
  it("shows the three totals, credit balance, months and the bill breakdown", async () => {
    svc.ledger.mockResolvedValue(LEDGER)
    wrap(<StudentLedgerView studentId={11} onBack={() => {}} />)
    await screen.findByText("Monthly Ledger — Ali Khan")
    expect(screen.getByText(/Admission No\. A-101/)).toBeTruthy()
    expect(screen.getByText("PKR 5,500")).toBeTruthy()
    expect(screen.getByText("PKR 4,000")).toBeTruthy()
    expect(screen.getByText("PKR 1,500")).toBeTruthy()
    expect(screen.getByTestId("credit-balance").textContent).toMatch(/Credit balance PKR 200.*net due PKR 1,300/)
    expect(screen.getAllByText(/Tuition 2,500/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Exam 500/).length).toBeGreaterThan(0)
    expect(screen.getAllByText("Partially Paid").length).toBeGreaterThan(0)
  })

  it("handles empty and error states", async () => {
    svc.ledger.mockResolvedValueOnce({ ...LEDGER, months: [], summary: { ...LEDGER.summary, creditBalance: 0 } })
    wrap(<StudentLedgerView studentId={11} onBack={() => {}} />)
    await screen.findByText("No fee records yet")
    cleanup()
    svc.ledger.mockRejectedValue(new Error("Student not found"))
    wrap(<StudentLedgerView studentId={12} onBack={() => {}} />)
    await screen.findByText("Student not found")
  })
})

describe("StudentLedgerView credit history (Step 5)", () => {
  it("lists credit movements with the running balance", async () => {
    svc.ledger.mockResolvedValue({
      ...LEDGER,
      creditHistory: [
        { id: 2, date: "2026-10-02T09:00:00Z", type: "Applied", source: "payment", amount: 300, balanceAfter: 200, receiptNo: null, paymentId: null, feeMonth: { id: 3, month: "2026-10", label: "Oct 2026", feeType: "Tuition" }, notes: null },
        { id: 1, date: "2026-09-20T09:00:00Z", type: "Credit", source: "payment", amount: 500, balanceAfter: 500, receiptNo: "RCPT-9", paymentId: 4, feeMonth: null, notes: null },
      ],
    })
    wrap(<StudentLedgerView studentId={11} onBack={() => {}} />)
    const panel = await screen.findByTestId("ledger-credit-history")
    expect(panel.textContent).toContain("Applied to Oct 2026 Tuition")
    expect(panel.textContent).toContain("Credit added")
    expect(panel.textContent).toContain("RCPT-9")
    expect(panel.textContent).toContain("bal 200")
  })
})
