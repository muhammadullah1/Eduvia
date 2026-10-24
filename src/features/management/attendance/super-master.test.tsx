import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import attendanceReviewService, { type TodayClass } from "@/api/attendance/attendance-review.service"

import { SuperMasterPanel } from "./super-master-panel"
import { TodayPanel } from "./today-panel"

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const row = (over: Partial<TodayClass>): TodayClass => ({
  classId: 1, classLabel: "Grade 1", teacher: "Sana Khan", taken: false, takenAt: null, students: 10,
  present: null, absent: null, late: null, leave: null, remindedAt: null,
  superMaster: "Sana Khan", superMasterState: "assigned", superMasterAbsent: false, substitutes: [], markedBy: null,
  ...over,
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("Today's Status and Super Masters", () => {
  it("unassigned classes show the state, no reminder button, and a way to assign", async () => {
    vi.spyOn(attendanceReviewService, "today").mockResolvedValue({
      date: "2026-10-23", total: 2, taken: 0, pending: 2,
      classes: [
        row({}),
        row({ classId: 2, classLabel: "Grade 2", teacher: null, superMaster: null, superMasterState: "unassigned" }),
      ],
    })
    const onAssign = vi.fn()
    wrap(<TodayPanel onAssign={onAssign} />)
    expect(await screen.findByText("No Super Master assigned")).toBeTruthy()
    expect(screen.getByText(/1 active class has no active Super Master/)).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Send reminder" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Assign Super Master" }))
    expect(onAssign).toHaveBeenCalled()
  })

  it("shows the substitute covering an absent Super Master", async () => {
    vi.spyOn(attendanceReviewService, "today").mockResolvedValue({
      date: "2026-10-23", total: 1, taken: 0, pending: 1,
      classes: [row({ superMasterAbsent: true, substitutes: ["Sadia Noor"], teacher: "Sadia Noor" })],
    })
    wrap(<TodayPanel onAssign={vi.fn()} />)
    expect(await screen.findByText("Sadia Noor")).toBeTruthy()
    expect(screen.getByText("Covering Sana Khan (absent)")).toBeTruthy()
  })

  it("lists classes with their Super Master and which other classes that teacher holds", async () => {
    vi.spyOn(attendanceReviewService, "superMasters").mockResolvedValue({
      classes: [
        { classId: 1, classLabel: "Grade 1", classStatus: "Active", state: "assigned", superMaster: { teacherId: 4, name: "Sana Khan", active: true } },
        { classId: 2, classLabel: "Grade 2", classStatus: "Active", state: "assigned", superMaster: { teacherId: 4, name: "Sana Khan", active: true } },
        { classId: 3, classLabel: "Grade 3", classStatus: "Active", state: "unassigned", superMaster: null },
      ],
      teachers: [{ teacherId: 4, name: "Sana Khan" }],
    })
    wrap(<SuperMasterPanel />)
    expect(await screen.findByText("1 active class needs one")).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Super Master of Grade 3" }).textContent).toContain("Not assigned")
    const grade1 = screen.getByRole("combobox", { name: "Super Master of Grade 1" }).closest("tr") as HTMLElement
    expect(within(grade1).getByText("Grade 2")).toBeTruthy()
  })
})
