import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, describe, expect, it, vi } from "vitest"

import { DatePicker } from "@/components/ui/date-picker"
import { getToday, toIsoDate } from "@/lib/dates"

// Node applies a changed TZ immediately, so one run covers every offset,
// including +14 and −11 where UTC-based parsing drifts by a day.
const ZONES = ["Asia/Karachi", "UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Pacific/Pago_Pago", "Europe/London"]
const originalTz = process.env.TZ

afterEach(() => cleanup())
afterAll(() => {
  process.env.TZ = originalTz
})

describe.each(ZONES)("dates in %s", (zone) => {
  it("the picker emits exactly the clicked calendar day", () => {
    process.env.TZ = zone
    const onChange = vi.fn()
    render(<DatePicker value="2026-11-15" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /15 Nov 2026/ }))
    const day = screen.getAllByRole("button").find((button) => button.textContent === "26")
    fireEvent.click(day as HTMLElement)
    expect(onChange).toHaveBeenCalledWith("2026-11-26")
  })

  it("clicking the already-selected day keeps it", () => {
    process.env.TZ = zone
    const onChange = vi.fn()
    render(<DatePicker value="2026-11-15" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: /15 Nov 2026/ }))
    const day = screen.getAllByRole("button").find((button) => button.textContent === "15")
    fireEvent.click(day as HTMLElement)
    expect(onChange).not.toHaveBeenCalledWith("")
    expect(screen.getByRole("button", { name: /15 Nov 2026/ })).toBeTruthy()
  })

  it("month and year use shadcn selects, not native ones", () => {
    process.env.TZ = zone
    render(<DatePicker value="2026-11-15" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /15 Nov 2026/ }))
    expect(document.querySelector("select")).toBeNull()
    expect(screen.getAllByRole("combobox").length).toBe(2)
  })

  it("formats local dates without going through UTC", () => {
    process.env.TZ = zone
    expect(toIsoDate(new Date(2026, 10, 26, 0, 30))).toBe("2026-11-26")
    expect(toIsoDate(new Date(2026, 10, 26, 23, 30))).toBe("2026-11-26")
    expect(getToday()).toBe(toIsoDate(new Date()))
  })
})
