import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { PromotionAction } from "@/api/students/promotions.service"
import type { ClassSection } from "@/data/types"
import type { ApiStudent } from "@/lib/api-types"

const bulkPromote = vi.fn()
vi.mock("@/api/students/promotions.service", () => ({
  default: { bulkPromote: (...args: unknown[]) => bulkPromote(...args) },
  PROMOTION_HISTORY_QUERY_KEY: "promotion-history",
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { PromoteConfirmDialog } = await import("./promote-confirm-dialog")

const klass = (id: string, grade: string): ClassSection => ({ id, grade, section: "Main", label: grade, room: "", periodCount: 8, monthlyFee: 0 })
const student = (id: number, firstName: string): ApiStudent => ({ id, fkClassId: 5, admissionNo: `A${id}`, firstName, lastName: "Khan", status: "Active" })

function renderDialog(actions: Map<number, PromotionAction>, onDone = vi.fn()) {
  const students = [student(1, "Ali"), student(2, "Sara")]
  const counts = { promote: 0, hold: 0, graduate: 0 }
  for (const s of students) counts[actions.get(s.id) ?? "promote"] += 1
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PromoteConfirmDialog
        open
        onOpenChange={vi.fn()}
        source={klass("5", "Grade 1")}
        target={klass("6", "Grade 2")}
        targetSession={{ id: "1", name: "2026–27", start: "2026-04-01", end: "2027-03-31", current: true }}
        sameSession
        targetClasses={[klass("5", "Grade 1"), klass("6", "Grade 2")]}
        students={students}
        actions={actions}
        counts={counts}
        onDone={onDone}
        onStale={vi.fn()}
      />
    </QueryClientProvider>
  )
  return onDone
}

afterEach(() => {
  cleanup()
  bulkPromote.mockReset()
})

describe("PromoteConfirmDialog", () => {
  it("summarises each student's outcome and sends one bulk request", async () => {
    const result = { promoted: 1, repeated: 1, graduated: 0, session: { id: 1, name: "2026–27" } }
    bulkPromote.mockResolvedValue(result)
    const onDone = renderDialog(new Map([[1, "promote"], [2, "hold"]]))

    expect(screen.getByText("Confirm promotion")).toBeInTheDocument()
    expect(screen.getAllByText("→ Grade 2").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Repeats Grade 1").length).toBe(1)

    fireEvent.click(screen.getByRole("button", { name: /Confirm & promote 2/ }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(result))
    expect(bulkPromote).toHaveBeenCalledWith(expect.objectContaining({
      fromClassId: 5, toClassId: 6, sessionId: 1,
      students: [{ studentId: 1, action: "promote" }, { studentId: 2, action: "hold" }],
    }))
  })

  it("blocks graduation without a final result", async () => {
    renderDialog(new Map([[1, "graduate"], [2, "graduate"]]))
    fireEvent.change(screen.getByLabelText("Final result for graduates"), { target: { value: " " } })
    fireEvent.click(screen.getByRole("button", { name: /Confirm & promote/ }))
    expect(await screen.findByText(/Enter the final result/)).toBeInTheDocument()
    expect(bulkPromote).not.toHaveBeenCalled()
  })
})
