import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import teacherAttendanceService, { type AttendanceReminder } from "@/api/attendance/teacher-attendance.service"

import { TeacherNotificationsBell, TodayAttendanceDuty } from "./attendance-notices"

const reminder = (over: Partial<AttendanceReminder> = {}): AttendanceReminder => ({
  id: 7,
  classId: 1,
  classLabel: "Grade 1",
  date: "2026-10-23",
  sentAt: "2026-10-23T05:00:00Z",
  sentBy: "Office Admin",
  readAt: null,
  taken: false,
  role: "SuperMaster",
  ...over,
})

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("TeacherNotificationsBell", () => {
  it("shows unread reminders, marks them read on open, and links to attendance", async () => {
    vi.spyOn(teacherAttendanceService, "reminders").mockResolvedValue([reminder()])
    const read = vi.spyOn(teacherAttendanceService, "markRead").mockResolvedValue({ id: 7, readAt: "now" })
    const onOpen = vi.fn()
    wrap(<TeacherNotificationsBell onOpenAttendance={onOpen} />)
    expect(await screen.findByTestId("notif-dot")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Notifications, 1 unread/ }))
    await waitFor(() => expect(read).toHaveBeenCalledWith(7))
    fireEvent.click(await screen.findByText("Take attendance for Grade 1"))
    expect(onOpen).toHaveBeenCalled()
  })

  it("has no badge once read or taken, and says when there is nothing", async () => {
    vi.spyOn(teacherAttendanceService, "reminders").mockResolvedValue([])
    wrap(<TeacherNotificationsBell onOpenAttendance={vi.fn()} />)
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }))
    expect(await screen.findByText("You're all caught up.")).toBeTruthy()
    expect(screen.queryByTestId("notif-dot")).toBeNull()
  })
})

describe("TodayAttendanceDuty", () => {
  it("tells a substitute whom they cover and surfaces a pending reminder", async () => {
    vi.spyOn(teacherAttendanceService, "responsibilities").mockResolvedValue([
      { classId: 1, classLabel: "Grade 1", role: "Substitute", coveringFor: "Sana Khan" },
    ])
    vi.spyOn(teacherAttendanceService, "reminders").mockResolvedValue([reminder({ role: "Substitute" })])
    wrap(<TodayAttendanceDuty onOpenAttendance={vi.fn()} />)
    expect(await screen.findByText(/waiting for today's attendance: Grade 1/)).toBeTruthy()
    expect(screen.getByText("Grade 1 · covering Sana Khan")).toBeTruthy()
  })

  it("renders nothing for a teacher with no register", async () => {
    vi.spyOn(teacherAttendanceService, "responsibilities").mockResolvedValue([])
    vi.spyOn(teacherAttendanceService, "reminders").mockResolvedValue([])
    const { container } = wrap(<TodayAttendanceDuty onOpenAttendance={vi.fn()} />)
    await waitFor(() => expect(teacherAttendanceService.reminders).toHaveBeenCalled())
    expect(container.textContent).toBe("")
  })
})
