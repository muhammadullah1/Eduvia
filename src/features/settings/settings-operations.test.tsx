import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ArchivesHub,
  BlockDatesPanel,
  LocationsPanel,
  RolesPanel,
} from "./settings-operations"

vi.mock("./hooks/use-archived-counts", () => ({
  useArchivedCounts: () => ({
    classes: 4,
    subjects: 2,
    staff: 1,
    locations: 0,
    dates: 3,
    total: 10,
    isLoading: false,
  }),
}))

vi.mock("@/features/management/classes/archived-classes-panel", () => ({
  ArchivedClassesPanel: () => (
    <div data-testid="archived-classes">Classes Panel</div>
  ),
}))

vi.mock("@/features/management/sessions/hooks/use-sessions", () => ({
  useSessionsList: () => ({
    data: [
      { id: "1", name: "2026-2027", current: true },
      { id: "2", name: "2027-2028", current: false },
    ],
  }),
}))

vi.mock("@/api/subjects/subjects.service", () => ({
  default: {
    list: vi.fn().mockResolvedValue([
      { id: 1, name: "Physics", code: "PHY" },
    ]),
  },
}))

vi.mock("@/api/users/users.service", () => ({
  default: {
    list: vi.fn().mockResolvedValue({
      users: [
        {
          id: 10,
          firstName: "John",
          lastName: "Doe",
          email: "j@cls.edu",
          role: "teacher",
        },
      ],
    }),
  },
}))

const mockCreateBlockDate = vi.fn().mockResolvedValue({
  id: 101,
  name: "Spring Break",
  dateType: "multiple",
  startDate: "2027-03-20",
  endDate: "2027-03-27",
})
const mockUpdateBlockDate = vi.fn().mockResolvedValue({
  id: 1,
  name: "Winter Break Updated",
  dateType: "multiple",
  startDate: "2026-12-24",
  endDate: "2027-01-02",
})
const mockArchiveBlockDate = vi.fn().mockResolvedValue(undefined)

const mockCreateLocation = vi.fn().mockResolvedValue({
  id: 201,
  fkSessionId: 1,
  name: "Physics Lab",
  locationCode: "LAB-PHY",
  locationType: "lab",
  capacity: 35,
})
const mockUpdateLocation = vi.fn().mockResolvedValue({
  id: 1,
  name: "Room 101 Renamed",
})
const mockArchiveLocation = vi.fn().mockResolvedValue(undefined)

vi.mock("@/api/settings/school-catalog.service", () => ({
  default: {
    listBlockDates: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Winter Break",
        dateType: "multiple",
        startDate: "2026-12-24",
        endDate: "2027-01-02",
        description: "School holiday",
      },
    ]),
    createBlockDate: (...args: unknown[]) => mockCreateBlockDate(...args),
    updateBlockDate: (...args: unknown[]) => mockUpdateBlockDate(...args),
    archiveBlockDate: (...args: unknown[]) => mockArchiveBlockDate(...args),

    listLocations: vi.fn().mockResolvedValue([
      {
        id: 1,
        fkSessionId: 1,
        name: "Room 101",
        locationCode: "R-101",
        locationType: "classroom",
        capacity: 30,
      },
    ]),
    createLocation: (...args: unknown[]) => mockCreateLocation(...args),
    updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
    archiveLocation: (...args: unknown[]) => mockArchiveLocation(...args),
  },
}))

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  )
}

describe("BlockDatesPanel modal and actions", () => {
  beforeEach(() => {
    mockCreateBlockDate.mockClear()
    mockUpdateBlockDate.mockClear()
    mockArchiveBlockDate.mockClear()
  })

  afterEach(cleanup)

  it("renders block dates list and Add block date button", async () => {
    wrap(<BlockDatesPanel />)

    expect(screen.getByRole("button", { name: /Add Block Date\(s\)/i })).toBeTruthy()
    expect(await screen.findByText("Winter Break")).toBeTruthy()
    expect(screen.getByText(/Dec 24, 2026 – Jan 2, 2027/i)).toBeTruthy()
  })

  it("opens modal on Add block date, cancels properly", async () => {
    wrap(<BlockDatesPanel />)

    fireEvent.click(screen.getByRole("button", { name: /Add Block Date\(s\)/i }))

    expect(await screen.findByRole("dialog")).toBeTruthy()
    expect(
      screen.getByRole("heading", { name: "Add Block Date" })
    ).toBeTruthy()

    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens modal for editing an existing block date with populated data", async () => {
    wrap(<BlockDatesPanel />)

    expect(await screen.findByText("Winter Break")).toBeTruthy()

    const editBtn = screen.getByRole("button", { name: /Edit Winter Break/i })
    fireEvent.click(editBtn)

    expect(await screen.findByRole("dialog")).toBeTruthy()
    expect(
      screen.getByRole("heading", { name: "Edit Block Date(s)" })
    ).toBeTruthy()
    expect(screen.getByDisplayValue("Winter Break")).toBeTruthy()
    expect(screen.getByDisplayValue("School holiday")).toBeTruthy()
  })

  it("opens archive confirmation dialog when Archive is clicked", async () => {
    wrap(<BlockDatesPanel />)

    expect(await screen.findByText("Winter Break")).toBeTruthy()

    const archiveBtn = screen.getByRole("button", {
      name: /Archive Winter Break/i,
    })
    fireEvent.click(archiveBtn)

    expect(await screen.findByText("Archive this block date?")).toBeTruthy()
  })
})

describe("LocationsPanel modal and actions", () => {
  beforeEach(() => {
    mockCreateLocation.mockClear()
    mockUpdateLocation.mockClear()
    mockArchiveLocation.mockClear()
  })

  afterEach(cleanup)

  it("renders locations list, session selector, and Add room button", async () => {
    wrap(<LocationsPanel />)

    expect(screen.getByRole("button", { name: /Add New Room/i })).toBeTruthy()
    expect(await screen.findByText("Room 101")).toBeTruthy()
    expect(screen.getByText("30")).toBeTruthy()
    expect(screen.queryByText("R-101")).toBeNull()
  })

  it("opens modal on Add room, cancels properly", async () => {
    wrap(<LocationsPanel />)

    fireEvent.click(screen.getByRole("button", { name: /Add New Room/i }))

    expect(await screen.findByRole("dialog")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Add New Room" })).toBeTruthy()

    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens modal for editing an existing location with populated data", async () => {
    wrap(<LocationsPanel />)

    expect(await screen.findByText("Room 101")).toBeTruthy()

    const editBtn = screen.getByRole("button", { name: /Edit Room 101/i })
    fireEvent.click(editBtn)

    expect(await screen.findByRole("dialog")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Edit Room" })).toBeTruthy()
    expect(screen.getByDisplayValue("Room 101")).toBeTruthy()
    expect(screen.getByDisplayValue("R-101")).toBeTruthy()
  })
})

describe("RolesPanel capability search", () => {
  afterEach(cleanup)

  it("renders search input, capability count, and full permission matrix by default", () => {
    wrap(<RolesPanel />)

    const searchInput = screen.getByPlaceholderText(/Search capabilities/i)
    expect(searchInput).toBeTruthy()

    expect(screen.getByText(/Showing \d+ of \d+ capabilities/i)).toBeTruthy()
    expect(screen.getByText("Super Admin")).toBeTruthy()
    expect(screen.getByText("Operations Manager")).toBeTruthy()
  })

  it("filters capability rows dynamically by search query", () => {
    wrap(<RolesPanel />)

    const searchInput = screen.getByPlaceholderText(/Search capabilities/i)
    fireEvent.change(searchInput, { target: { value: "fees.totals" } })

    expect(screen.getByText("fees.totals")).toBeTruthy()
    expect(screen.queryByText("attendance.take")).toBeNull()
  })

  it("shows empty state and allows clearing search filter", () => {
    wrap(<RolesPanel />)

    const searchInput = screen.getByPlaceholderText(/Search capabilities/i)
    fireEvent.change(searchInput, { target: { value: "nonexistent_xyz" } })

    expect(screen.getByText(/No capabilities match/i)).toBeTruthy()

    const clearBtn = screen.getByRole("button", { name: /Clear filter/i })
    fireEvent.click(clearBtn)

    expect(searchInput).toHaveValue("")
    expect(screen.queryByText(/No capabilities match/i)).toBeNull()
  })
})

describe("ArchivesHub subtabs with live counts", () => {
  afterEach(cleanup)

  it("displays sub-tab pills with counts from backend data", () => {
    wrap(<ArchivesHub />)

    expect(screen.getByRole("button", { name: /Classes/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Subjects/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Staff/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Locations/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Block dates/i })).toBeTruthy()

    // Counts rendered in pills
    expect(screen.getByText("4")).toBeTruthy()
    expect(screen.getByText("2")).toBeTruthy()
    expect(screen.getByText("1")).toBeTruthy()
    expect(screen.getByText("0")).toBeTruthy()
    expect(screen.getByText("3")).toBeTruthy()
  })

  it("switches archive panels on click", async () => {
    wrap(<ArchivesHub />)

    expect(screen.getByTestId("archived-classes")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Subjects/i }))
    expect(await screen.findByText("Physics")).toBeTruthy()
  })
})
