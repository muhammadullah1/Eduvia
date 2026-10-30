import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "@/data/types"
import type { Role } from "@/lib/auth"
import { grantRoleDefaults } from "@/test/permissions"

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

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
}

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
    grantRoleDefaults("super_admin")
    mockUpdateSettings.mockReset()
    mockUpdateSettings.mockResolvedValue(null)
    mockSyncPortalForRoute.mockReset()
  })

  afterEach(cleanup)

  it("renders Rules & Config sections aligned with API-backed settings", () => {
    wrap(<SettingsGeneralRules />)

    expect(screen.getByText("Grading Scale")).toBeTruthy()
    expect(screen.getByText("Rank & Tie Rules")).toBeTruthy()
    expect(screen.getByText("Attendance")).toBeTruthy()
    expect(screen.getByText("Daily Test")).toBeTruthy()
    expect(screen.getByText("Result Visibility & Fee Condition")).toBeTruthy()
    expect(screen.getByText("Fee billing & advance limits")).toBeTruthy()
    expect(screen.getByText("Student admission format")).toBeTruthy()
    expect(screen.getByText("CLS0001")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Save Configuration" })
    ).toBeTruthy()
  })

  it("shows unsaved changes indicator when a field is edited", () => {
    wrap(<SettingsGeneralRules />)

    expect(screen.queryByText("Unsaved changes")).toBeNull()

    const passInput = screen.getByDisplayValue("40")
    fireEvent.change(passInput, { target: { value: "55" } })

    expect(screen.getAllByText("Unsaved changes").length).toBeGreaterThanOrEqual(1)
  })

  it("saves dirty daily-test rules only after Save Configuration and awaits API success", async () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.change(screen.getByDisplayValue("40"), { target: { value: "55" } })
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }))
    await flush()

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyTestRules: expect.objectContaining({ passPercent: 55 }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("saves fee settings without a school-wide tuition amount", async () => {
    wrap(<SettingsGeneralRules />)

    expect(screen.queryByLabelText("Fallback monthly tuition")).toBeNull()
    expect(screen.getByText(/Fee Management → Fee Structure/)).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Max advance months"), {
      target: { value: "8" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }))
    await flush()

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        fees: expect.objectContaining({
          dueDay: 10,
          maxAdvanceMonths: 8,
          concessionPolicy: {
            allowedModes: ["percent", "fixed_discount", "waiver"],
            approvalRule: "none",
            approvalPercentAbove: null,
            approvalAmountAbove: null,
          },

        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
    const feesArg = mockUpdateSettings.mock.calls.find(
      (call) => call[0] && typeof call[0] === "object" && "fees" in call[0]
    )?.[0] as { fees?: Record<string, unknown> } | undefined
    expect(feesArg?.fees).not.toHaveProperty("defaultMonthlyFee")
  })

  it("saves concession approval rule with fee settings", async () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.click(screen.getByRole("combobox", { name: "Concession approval rule" }))
    fireEvent.click(await screen.findByRole("option", { name: /Always require approval/i }))
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }))
    await flush()

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        fees: expect.objectContaining({
          concessionPolicy: expect.objectContaining({
            approvalRule: "always",
          }),
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("saves attendance settings when attendance fields are dirty", async () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.change(screen.getByDisplayValue("7"), { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }))
    await flush()

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        attendance: expect.objectContaining({
          editWindowDays: 5,
          lowThreshold: 75,
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("saves admission format when admission fields are dirty", async () => {
    wrap(<SettingsGeneralRules />)

    fireEvent.change(screen.getByDisplayValue("CLS"), {
      target: { value: "EDU" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }))
    await flush()

    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        admission: expect.objectContaining({
          prefix: "EDU",
          digits: 4,
        }),
      }),
      expect.objectContaining({ role: "super_admin" })
    )
  })

  it("keeps fee and result controls locked for Operations Manager", () => {
    currentRole = "operations_manager"
    grantRoleDefaults("operations_manager")
    wrap(<SettingsGeneralRules />)

    expect(
      screen.getByRole("button", { name: "Save Configuration" })
    ).toBeTruthy()
    const badges = screen.getAllByText("Super Admin Only")
    expect(badges.length).toBeGreaterThanOrEqual(2)
    expect(
      screen.getByLabelText("Block result access when fees are outstanding")
    ).toBeDisabled()
  })

  it("preserves unsaved form values when the API save fails", async () => {
    mockUpdateSettings.mockResolvedValue("Server rejected the update.")
    wrap(<SettingsGeneralRules />)

    fireEvent.change(screen.getByDisplayValue("40"), { target: { value: "61" } })
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }))
    await flush()

    expect(screen.getByDisplayValue("61")).toBeTruthy()
    expect(screen.getAllByText("Unsaved changes").length).toBeGreaterThanOrEqual(1)
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
    grantRoleDefaults("super_admin")
  })

  afterEach(cleanup)

  it("renders Rules & Config header and content by default", () => {
    wrap(<SettingsPage section="settings" />, ["/admin/settings"])
    expect(screen.getByRole("heading", { name: "Rules & Config" })).toBeTruthy()
    expect(
      screen.getByText(
        "School profile, grading reference, attendance, daily tests, fees, and result rules."
      )
    ).toBeTruthy()
    expect(screen.getByText("Daily Test")).toBeTruthy()
  })

  it("safely handles redundant academic panel and section by defaulting to Rules & Config", async () => {
    wrap(<SettingsPage section="settings-academic" />, [
      "/admin/settings-academic",
    ])
    expect(screen.getByRole("heading", { name: "Rules & Config" })).toBeTruthy()

    cleanup()
    wrap(<SettingsPage section="settings" />, [
      "/admin/settings?panel=academic",
    ])
    expect(screen.getByRole("heading", { name: "Rules & Config" })).toBeTruthy()
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

  it("sends the legacy roles panel to the Roles & Permissions page", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/admin/settings?panel=roles"]}>
          <Routes>
            <Route path="/admin/settings" element={<SettingsPage section="settings" />} />
            <Route path="/admin/roles" element={<p>Roles page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(await screen.findByText("Roles page")).toBeTruthy()
  })
})
