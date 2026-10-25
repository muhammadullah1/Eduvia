import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "@/data/types"
import type { Role } from "@/lib/auth"

import { SettingsGeneralRules } from "./settings-general-rules"
import { SettingsPage } from "./settings-page"

let currentRole: Role = "super_admin"
const mockUpdateSettings = vi.fn()
const mockSyncPortalForRoute = vi.fn()

vi.mock("@/lib/actor", () => ({
  useActor: () => ({ role: currentRole, name: "Test Actor", email: "actor@cls.edu" }),
}))

vi.mock("@/data/store", () => ({
  useSchool: () => ({
    state: {
      settings: DEFAULT_SETTINGS,
      classes: [],
      sessions: [],
    },
    updateSettings: mockUpdateSettings,
    syncPortalForRoute: mockSyncPortalForRoute,
  }),
}))

vi.mock("@/features/management/sessions/hooks/use-sessions", () => ({
  useSessionsList: () => ({
    data: [{ id: "session-1", name: "2026-2027", current: true }],
  }),
}))

vi.mock("./settings-operations", () => ({
  BlockDatesPanel: () => <div data-testid="block-dates-panel">Calendar Panel</div>,
  LocationsPanel: () => <div data-testid="locations-panel">Locations Panel</div>,
  ArchivesHub: () => <div data-testid="archives-hub">Archives Panel</div>,
  RolesPanel: () => <div data-testid="roles-panel">Roles Panel</div>,
}))

function wrap(node: ReactNode, initialEntries = ["/admin/settings"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("SettingsGeneralRules", () => {
  beforeEach(() => {
    currentRole = "super_admin"
    mockUpdateSettings.mockReset()
    mockSyncPortalForRoute.mockReset()
  })

  afterEach(cleanup)

  it("renders all 5 setting cards for Super Admin with live admission preview", () => {
    wrap(<SettingsGeneralRules />)

    expect(screen.getByText("Weekly test pass criteria")).toBeTruthy()
    expect(screen.getByText("Result fee & rank rules")).toBeTruthy()
    expect(screen.getByText("Fee billing & advance limits")).toBeTruthy()
    expect(screen.getByText("Attendance policies")).toBeTruthy()
    expect(screen.getByText("Student admission format")).toBeTruthy()

    // Live preview
    expect(screen.getByText("CLS0001")).toBeTruthy()

    // Save buttons for all 5 cards
    expect(screen.getByRole("button", { name: "Save criteria" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save result rules" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save fee settings" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save attendance settings" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save admission format" })).toBeTruthy()
  })

  it("calls updateSettings when clicking Save criteria", () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.click(screen.getByRole("button", { name: "Save criteria" }))
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyTestRules: expect.objectContaining({
          passPercent: 40,
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("calls updateSettings when clicking Save fee settings", () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.click(screen.getByRole("button", { name: "Save fee settings" }))
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        fees: expect.objectContaining({
          defaultMonthlyFee: 8500,
          dueDay: 10,
          maxAdvanceMonths: 12,
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("calls updateSettings when clicking Save attendance settings", () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.click(screen.getByRole("button", { name: "Save attendance settings" }))
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        attendance: expect.objectContaining({
          editWindowDays: 7,
          lowThreshold: 75,
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("calls updateSettings when clicking Save admission format", () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.click(screen.getByRole("button", { name: "Save admission format" }))
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        admission: expect.objectContaining({
          prefix: "CLS",
          digits: 4,
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("enforces role-based permissions for Operations Manager (fees and results read-only)", () => {
    currentRole = "operations_manager"
    wrap(<SettingsGeneralRules />)

    // Academic controls are editable
    expect(screen.getByRole("button", { name: "Save criteria" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save attendance settings" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save admission format" })).toBeTruthy()

    // Fee and result write buttons are hidden
    expect(screen.queryByRole("button", { name: "Save fee settings" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Save result rules" })).toBeNull()

    // "Set by the super admin." note is shown
    const notes = screen.getAllByText("Set by the super admin.")
    expect(notes.length).toBeGreaterThanOrEqual(2)
  })
})

describe("SettingsPage panel navigation", () => {
  beforeEach(() => {
    currentRole = "super_admin"
  })

  afterEach(cleanup)

  it("renders General & rules by default", () => {
    wrap(<SettingsPage />, ["/admin/settings"])
    expect(screen.getByText("General & assessment rules")).toBeTruthy()
    expect(screen.getByText("Weekly test pass criteria")).toBeTruthy()
  })

  it("renders Academic setup when panel=academic", () => {
    wrap(<SettingsPage />, ["/admin/settings?panel=academic"])
    expect(screen.getByRole("heading", { name: "Academic setup" })).toBeTruthy()
    expect(screen.getByText("Academic sessions")).toBeTruthy()
    expect(screen.getByText("Classes & sections")).toBeTruthy()
    expect(screen.getByText("Subjects")).toBeTruthy()
  })

  it("renders Calendar when panel=calendar", () => {
    wrap(<SettingsPage />, ["/admin/settings?panel=calendar"])
    expect(screen.getByTestId("block-dates-panel")).toBeTruthy()
  })

  it("renders Rooms when panel=rooms", () => {
    wrap(<SettingsPage />, ["/admin/settings?panel=rooms"])
    expect(screen.getByTestId("locations-panel")).toBeTruthy()
  })

  it("renders Archives when panel=archives", () => {
    wrap(<SettingsPage />, ["/admin/settings?panel=archives"])
    expect(screen.getByTestId("archives-hub")).toBeTruthy()
  })

  it("renders Roles when panel=roles", () => {
    wrap(<SettingsPage />, ["/admin/settings?panel=roles"])
    expect(screen.getByTestId("roles-panel")).toBeTruthy()
  })
})
