import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ImportBatch, ImportResult, ImportRow } from "@/api/fees/fee-import.service"
import { grantRoleDefaults } from "@/test/permissions"

import { OfflineSyncPage } from "./offline-sync-page"
import { fileProblem, pillCounts, rowLabel, rowTone } from "./offline-sync-rules"

const svc = vi.hoisted(() => ({ template: vi.fn(), validate: vi.fn(), commit: vi.fn(), discard: vi.fn(), detail: vi.fn(), history: vi.fn(), errorReport: vi.fn() }))
const actor = vi.hoisted(() => ({ role: "super_admin" }))

vi.mock("@/api/fees/fee-import.service", async (orig) => ({
  ...(await orig<typeof import("@/api/fees/fee-import.service")>()),
  default: svc,
}))
vi.mock("@/lib/actor", () => ({ useActor: () => ({ role: actor.role, name: "Test" }) }))

const row = (n: number, status: ImportRow["status"], extra: Partial<ImportRow> = {}): ImportRow => ({
  rowNumber: n, admissionNo: `CLS-${n}`, studentName: `Student ${n}`, className: "Class 1 – A", month: "2026-09", amount: 3600,
  paymentDate: "2026-09-15", referenceNo: `CASH-${n}`, paymentMethod: "Cash", status, reasons: [], receiptNo: null, ...extra,
})
const BATCH: ImportBatch = {
  id: 9, fileName: "fee_collection_sep28.xlsx", fileHash: "abc", status: "Validated", createdAt: "2026-09-28T09:23:00Z", committedAt: null,
  uploadedBy: "Admin", totalRows: 4, validRows: 2, importedRows: 0, skippedRows: 1, failedRows: 1, hasErrorReport: true, validAmount: 7200,
}
const VALIDATED: ImportResult = {
  batch: BATCH,
  rows: [
    row(2, "Valid"),
    row(3, "Valid"),
    row(4, "Duplicate", { referenceNo: "TRF-9901", reasons: ["Receipt TRF-9901 already exists in the system (RCPT-1)."] }),
    row(5, "Error", { admissionNo: "CLS-9999-XXX", studentName: null, amount: null, reasons: ["Student ID CLS-9999-XXX not found."] }),
  ],
  previousImport: null,
}
const COMMITTED: ImportResult = {
  batch: { ...BATCH, status: "Committed", committedAt: "2026-09-28T09:25:00Z", importedRows: 2 },
  rows: VALIDATED.rows.map((r) => (r.status === "Valid" ? { ...r, status: "Imported" as const, receiptNo: `RCPT-${r.rowNumber}` } : r)),
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}
const xlsx = (name = "fees.xlsx", size = 2048) => new File([new Uint8Array(size)], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

async function toResults() {
  wrap(<OfflineSyncPage />)
  fireEvent.click(screen.getByRole("button", { name: /Next/ }))
  fireEvent.click(screen.getByRole("button", { name: /Continue to Upload/ }))
  fireEvent.change(screen.getByTestId("sync-file-input"), { target: { files: [xlsx()] } })
  fireEvent.click(screen.getByRole("button", { name: /Validate File/ }))
  await screen.findByTestId("step-results")
}

beforeEach(() => {
  actor.role = "super_admin"
  grantRoleDefaults("super_admin")
  Object.values(svc).forEach((fn) => fn.mockReset())
  svc.history.mockResolvedValue([COMMITTED.batch, { ...BATCH, id: 8, status: "Validated" }])
  svc.validate.mockResolvedValue(VALIDATED)
  svc.commit.mockResolvedValue(COMMITTED)
  svc.discard.mockResolvedValue(VALIDATED)
  svc.template.mockResolvedValue("fee-import-template.xlsx")
  svc.errorReport.mockResolvedValue("errors.xlsx")
})
afterEach(cleanup)

describe("offline sync rules", () => {
  it("checks the file before upload", () => {
    expect(fileProblem(null)).toMatch(/Choose/)
    expect(fileProblem(xlsx("fees.csv"))).toMatch(/Only Excel/)
    expect(fileProblem(xlsx("fees.xlsx", 0))).toMatch(/empty/)
    expect(fileProblem(xlsx("fees.xlsx", 800 * 1024))).toMatch(/larger than 700 KB/)
    expect(fileProblem(xlsx("OLD.XLS"))).toBeNull()
  })
  it("maps row statuses to the Figma pills", () => {
    expect([rowLabel("Valid"), rowTone("Valid")]).toEqual(["Valid", "success"])
    expect([rowLabel("Duplicate"), rowTone("Duplicate")]).toEqual(["Skipped duplicate", "warning"])
    expect([rowLabel("Skipped"), rowTone("Skipped")]).toEqual(["Skipped duplicate", "warning"])
    expect([rowLabel("Error"), rowTone("Error")]).toEqual(["Failed", "danger"])
    expect(pillCounts(BATCH)).toEqual({ valid: 2, skipped: 1, failed: 1 })
    expect(pillCounts(COMMITTED.batch)).toEqual({ valid: 2, skipped: 1, failed: 1 })
  })
})

describe("OfflineSyncPage", () => {
  it("downloads the template and lists the rules", async () => {
    wrap(<OfflineSyncPage />)
    fireEvent.click(screen.getByRole("button", { name: /Download Template/ }))
    await waitFor(() => expect(svc.template).toHaveBeenCalled())
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    expect(screen.getByTestId("step-rules").textContent).toMatch(/future months are rejected/)
  })

  it("rejects a non-Excel file without uploading", async () => {
    wrap(<OfflineSyncPage />)
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continue to Upload/ }))
    fireEvent.drop(screen.getByTestId("sync-dropzone"), { dataTransfer: { files: [xlsx("fees.csv")] } })
    expect(screen.getByTestId("sync-file-error").textContent).toMatch(/Only Excel/)
    expect((screen.getByRole("button", { name: /Validate File/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(svc.validate).not.toHaveBeenCalled()
  })

  it("shows the server's validation error on the upload step", async () => {
    svc.validate.mockRejectedValue(new Error("The file is missing template columns: Amount."))
    wrap(<OfflineSyncPage />)
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continue to Upload/ }))
    fireEvent.change(screen.getByTestId("sync-file-input"), { target: { files: [xlsx()] } })
    fireEvent.click(screen.getByRole("button", { name: /Validate File/ }))
    expect((await screen.findByTestId("sync-file-error")).textContent).toMatch(/missing template columns/)
  })

  it("runs the full flow: results with pills and reasons, confirm, import once with one Idempotency-Key, summary", async () => {
    await toResults()
    const pills = screen.getByTestId("sync-pills").textContent
    expect(pills).toMatch(/2 Valid/)
    expect(pills).toMatch(/1 Skipped/)
    expect(pills).toMatch(/1 Failed/)
    const results = screen.getByTestId("step-results")
    expect(within(results).getAllByText(/Receipt TRF-9901 already exists/).length).toBeGreaterThan(0)
    expect(within(results).getAllByText(/Student ID CLS-9999-XXX not found/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: /Import 2 Valid Rows/ }))
    expect(screen.getByTestId("step-confirm").textContent).toMatch(/Total to import: PKR 7,200/)
    expect(svc.commit).not.toHaveBeenCalled() // nothing is written before confirming
    fireEvent.click(screen.getByRole("button", { name: /Confirm Import/ }))
    await screen.findByTestId("step-summary")
    expect(screen.getByText("Sync Complete")).toBeTruthy()
    expect(screen.getByTestId("summary-counts").textContent).toMatch(/2Successful1Skipped1Failed/)
    expect(svc.commit).toHaveBeenCalledTimes(1)
    const [id, key] = svc.commit.mock.calls[0]
    expect(id).toBe(9)
    expect(key).toMatch(/^ui-9-/)
    fireEvent.click(screen.getByRole("button", { name: /Download Error Report/ }))
    await waitFor(() => expect(svc.errorReport).toHaveBeenCalledWith(9, expect.anything()))
    fireEvent.click(screen.getByRole("button", { name: /Sync Another File/ }))
    expect(screen.getByTestId("step-upload")).toBeTruthy()
  })

  it("retries a failed commit with the same Idempotency-Key", async () => {
    svc.commit.mockRejectedValueOnce(new Error("Cannot connect to API server"))
    await toResults()
    fireEvent.click(screen.getByRole("button", { name: /Import 2 Valid Rows/ }))
    fireEvent.click(screen.getByRole("button", { name: /Confirm Import/ }))
    await waitFor(() => expect(svc.commit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect((screen.getByRole("button", { name: /Confirm Import/ }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole("button", { name: /Confirm Import/ }))
    await screen.findByTestId("step-summary")
    expect(svc.commit.mock.calls[1][1]).toBe(svc.commit.mock.calls[0][1])
  })

  it("start over discards the validated batch", async () => {
    await toResults()
    fireEvent.click(screen.getByRole("button", { name: /Start Over/ }))
    await waitFor(() => expect(svc.discard).toHaveBeenCalledWith(9, expect.anything()))
    expect(screen.getByTestId("step-upload")).toBeTruthy()
  })

  it("accountant never sees a money total; history lists committed files only", async () => {
    actor.role = "accountant"
    grantRoleDefaults("accountant")
    const noTotals = { ...BATCH }
    delete noTotals.validAmount
    svc.validate.mockResolvedValue({ ...VALIDATED, batch: noTotals })
    await toResults()
    fireEvent.click(screen.getByRole("button", { name: /Import 2 Valid Rows/ }))
    expect(screen.getByTestId("step-confirm").textContent).not.toMatch(/Total to import/)
    const history = await screen.findAllByTestId("history-row")
    expect(history).toHaveLength(1)
    expect(history[0].textContent).toMatch(/fee_collection_sep28\.xlsx/)
  })

  it("disables import when no row is valid (re-upload of the same file)", async () => {
    svc.validate.mockResolvedValue({
      batch: { ...BATCH, validRows: 0, skippedRows: 2, failedRows: 0 },
      rows: [row(2, "Duplicate", { reasons: ["Receipt CASH-2 already exists in the system (RCPT-2)."] }), row(3, "Duplicate")],
      previousImport: { batchId: 7, committedAt: "2026-09-28T09:25:00Z" },
    })
    await toResults()
    expect(screen.getByTestId("sync-previous").textContent).toMatch(/already imported/)
    expect((screen.getByRole("button", { name: /Import 0 Valid Rows/ }) as HTMLButtonElement).disabled).toBe(true)
  })
})
