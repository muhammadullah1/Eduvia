import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "@/data/types"
import type { Role } from "@/lib/auth"

import {
  SchoolProfileCard,
  SettingsGeneralRules,
} from "./settings-general-rules"
import { SettingsPage } from "./settings-page"

let currentRole: Role = "super_admin"
const mockUpdateSettings = vi.fn()
const mockSyncPortalForRoute = vi.fn()

vi.mock("@/lib/actor", () => ({
  useActor: () => ({
    role: currentRole,
    name: "Test Actor",
    email: "actor@cls.edu",
  }),
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

vi.mock("@/api/sessions/sessions.service", () => ({
  default: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "2026-2027",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        isCurrent: true,
      },
    ]),
  },
}))

vi.mock("@/api/classes/classes.service", () => ({
  default: {
    list: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  },
}))

vi.mock("@/api/subjects/subjects.service", () => ({
  default: {
    list: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]),
  },
}))

vi.mock("@/api/settings/school-catalog.service", () => ({
  default: {
    getCurrentSchool: vi.fn().mockResolvedValue({
      id: 1,
      name: "Creative Leaders School",
      code: "CLS",
      phone: "042-111-257257",
      email: "admin@cls.edu.pk",
      address: "Lahore, Pakistan",
      website: "https://creativeleaders.edu.pk",
      status: "active",
    }),
    listBlockDates: vi.fn().mockResolvedValue([]),
    listLocations: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock("./hooks/use-archived-counts", () => ({
  useArchivedCounts: () => ({
    classes: 2,
    subjects: 1,
    users: 0,
    locations: 0,
    dates: 0,
    total: 3,
    isLoading: false,
  }),
}))

vi.mock("./settings-operations", () => ({
  BlockDatesPanel: () => (
    <div data-testid="block-dates-panel">Calendar Panel</div>
  ),
  LocationsPanel: () => (
    <div data-testid="locations-panel">Locations Panel</div>
  ),
  ArchivesHub: () => <div data-testid="archives-hub">Archives Panel</div>,
  RolesPanel: () => <div data-testid="roles-panel">Roles Panel</div>,
}))

function wrap(node: ReactNode, initialEntries = ["/admin/settings"]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
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

  it("renders all 5 setting cards grouped into Academic & Financial sections", () => {
    wrap(<SettingsGeneralRules />)

    // Grouping section headers
    expect(screen.getByText("Academic & assessment policies")).toBeTruthy()
    expect(screen.getByText("Financial & result policies")).toBeTruthy()

    // 5 cards
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
    expect(
      screen.getByRole("button", { name: "Save attendance settings" })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Save admission format" })
    ).toBeTruthy()
  })

  it("shows unsaved changes indicator when a field is edited", () => {
    wrap(<SettingsGeneralRules />)

    // Before editing, no "Unsaved changes" indicator
    expect(screen.queryByText("Unsaved changes")).toBeNull()

    // Edit pass mark (default value is 40)
    const passInput = screen.getByDisplayValue("40")
    fireEvent.change(passInput, { target: { value: "55" } })

    // "Unsaved changes" badge appears
    expect(screen.getAllByText("Unsaved changes").length).toBeGreaterThanOrEqual(1)
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

    fireEvent.click(
      screen.getByRole("button", { name: "Save attendance settings" })
    )
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

    fireEvent.click(
      screen.getByRole("button", { name: "Save admission format" })
    )
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

  it("enforces role-based permissions for Operations Manager (fees and results read-only with Super Admin Only badge)", () => {
    currentRole = "operations_manager"
    wrap(<SettingsGeneralRules />)

    // Academic controls are editable
    expect(screen.getByRole("button", { name: "Save criteria" })).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Save attendance settings" })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Save admission format" })
    ).toBeTruthy()

    // Fee and result write buttons are hidden
    expect(
      screen.queryByRole("button", { name: "Save fee settings" })
    ).toBeNull()
    expect(
      screen.queryByRole("button", { name: "Save result rules" })
    ).toBeNull()

    // "Set by the super admin." note is shown
    const notes = screen.getAllByText("Set by the super admin.")
    expect(notes.length).toBeGreaterThanOrEqual(2)

    // "Super Admin Only" badge is displayed
    const badges = screen.getAllByText("Super Admin Only")
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  it("renders school profile card with details from API", async () => {
    wrap(<SchoolProfileCard />)

    expect(await screen.findByText("Creative Leaders School")).toBeTruthy()
    expect(screen.getByText("CLS")).toBeTruthy()
    expect(screen.getByText("042-111-257257")).toBeTruthy()
    expect(screen.getByText("admin@cls.edu.pk")).toBeTruthy()
    expect(screen.getByText("Active")).toBeTruthy()
  })
})

describe("SettingsPage panel navigation", () => {
  beforeEach(() => {
    currentRole = "super_admin"
  })

  afterEach(cleanup)

  it("renders General & Rules header and content by default", () => {
    wrap(<SettingsPage section="settings" />, ["/admin/settings"])
    expect(screen.getByRole("heading", { name: "General & Rules" })).toBeTruthy()
    expect(
      screen.getByText(
        "Manage school profile, academic policies, attendance, fees, and result rules."
      )
    ).toBeTruthy()
    expect(screen.getByText("Weekly test pass criteria")).toBeTruthy()
  })

  it("safely handles redundant academic panel and section by defaulting to General & Rules", async () => {
    wrap(<SettingsPage section="settings-academic" />, [
      "/admin/settings-academic",
    ])
    expect(screen.getByRole("heading", { name: "General & Rules" })).toBeTruthy()

    cleanup()
    wrap(<SettingsPage section="settings" />, [
      "/admin/settings?panel=academic",
    ])
    expect(screen.getByRole("heading", { name: "General & Rules" })).toBeTruthy()
  })

  it("renders Calendar & Holidays when section=settings-calendar or panel=calendar", () => {
    wrap(<SettingsPage section="settings-calendar" />, [
      "/admin/settings-calendar",
    ])
    expect(
      screen.getByRole("heading", { name: "Calendar & Holidays" })
    ).toBeTruthy()
    expect(screen.getByTestId("block-dates-panel")).toBeTruthy()

    cleanup()
    wrap(<SettingsPage section="settings" />, ["/admin/settings?panel=calendar"])
    expect(screen.getByTestId("block-dates-panel")).toBeTruthy()
  })

  it("renders Rooms when section=settings-rooms or panel=rooms", () => {
    wrap(<SettingsPage section="settings-rooms" />, ["/admin/settings-rooms"])
    expect(screen.getByRole("heading", { name: "Rooms" })).toBeTruthy()
    expect(screen.getByTestId("locations-panel")).toBeTruthy()

    cleanup()
    wrap(<SettingsPage section="settings" />, ["/admin/settings?panel=rooms"])
    expect(screen.getByTestId("locations-panel")).toBeTruthy()
  })

  it("renders Archives when section=settings-archives or panel=archives", () => {
    wrap(<SettingsPage section="settings-archives" />, [
      "/admin/settings-archives",
    ])
    expect(screen.getByRole("heading", { name: "Archives" })).toBeTruthy()
    expect(screen.getByTestId("archives-hub")).toBeTruthy()

    cleanup()
    wrap(<SettingsPage section="settings" />, ["/admin/settings?panel=archives"])
    expect(screen.getByTestId("archives-hub")).toBeTruthy()
  })

  it("renders Roles & Permissions when section=settings-roles or panel=roles", () => {
    wrap(<SettingsPage section="settings-roles" />, ["/admin/settings-roles"])
    expect(
      screen.getByRole("heading", { name: "Roles & Permissions" })
    ).toBeTruthy()
    expect(screen.getByTestId("roles-panel")).toBeTruthy()

    cleanup()
    wrap(<SettingsPage section="settings" />, ["/admin/settings?panel=roles"])
    expect(screen.getByTestId("roles-panel")).toBeTruthy()
  })
})
