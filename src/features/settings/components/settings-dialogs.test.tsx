import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { SchoolProfile } from "@/api/settings/school-catalog.service"
import type { GradeBand } from "@/data/types"

import { GradingScaleEditor } from "./grading-scale-editor"
import { SchoolLogoField } from "./school-logo-field"
import { SchoolProfileDialog } from "./school-profile-dialog"

const svc = vi.hoisted(() => ({ update: vi.fn() }))
const storage = vi.hoisted(() => ({ upload: vi.fn() }))
const jpeg = vi.hoisted(() => ({ convert: vi.fn() }))

vi.mock("@/api/settings/school-catalog.service", () => ({
  default: { updateCurrentSchool: svc.update },
}))
vi.mock("@/api/storage/storage.service", () => ({
  STORAGE_DIRS: { schoolLogo: (id: number) => `school-logos/${id}` },
  uploadFileToStorage: storage.upload,
}))
vi.mock("@/lib/image-to-jpeg", () => ({ imageToJpeg: jpeg.convert }))
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const SCHOOL: SchoolProfile = {
  id: 7,
  name: "Creative Leaders",
  code: "CLS",
  phone: "042 1234567",
  email: "office@cls.edu.pk",
  address: "Lahore",
  website: "",
  logo: null,
  logoUrl: null,
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview")
  globalThis.URL.revokeObjectURL = vi.fn()
})

beforeEach(() => {
  svc.update.mockReset()
  storage.upload.mockReset()
  jpeg.convert.mockReset()
})
afterEach(cleanup)

describe("SchoolProfileDialog", () => {
  it("sends only the changed fields", async () => {
    svc.update.mockResolvedValue({ ...SCHOOL, phone: "042 7654321" })
    const onOpenChange = vi.fn()
    wrap(<SchoolProfileDialog school={SCHOOL} open onOpenChange={onOpenChange} />)
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "042 7654321" } })
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }))
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith({ phone: "042 7654321" }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it("blocks an invalid email and website without calling the API", () => {
    wrap(<SchoolProfileDialog school={SCHOOL} open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } })
    fireEvent.change(screen.getByLabelText("Website"), { target: { value: "cls.edu.pk" } })
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }))
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy()
    expect(screen.getByText("Website must start with http:// or https://")).toBeTruthy()
    expect(svc.update).not.toHaveBeenCalled()
  })

  it("shows the server's error", async () => {
    svc.update.mockRejectedValue(new Error("Another school already uses this email."))
    wrap(<SchoolProfileDialog school={SCHOOL} open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "taken@cls.edu.pk" } })
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }))
    expect(await screen.findByText("Another school already uses this email.")).toBeTruthy()
  })
})

describe("GradingScaleEditor", () => {
  const BANDS: GradeBand[] = [
    { min: 80, grade: "A" },
    { min: 0, grade: "F" },
  ]

  it("edits, adds and removes bands and shows the error", () => {
    const onChange = vi.fn()
    wrap(<GradingScaleEditor bands={BANDS} disabled={false} error="Bands overlap." onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("Band 1 grade"), { target: { value: "A+" } })
    expect(onChange).toHaveBeenLastCalledWith([{ min: 80, grade: "A+" }, { min: 0, grade: "F" }])
    fireEvent.change(screen.getByLabelText("Band 1 minimum percent"), { target: { value: "8x5" } })
    expect(onChange).toHaveBeenLastCalledWith([{ min: 85, grade: "A" }, { min: 0, grade: "F" }])
    fireEvent.click(screen.getByRole("button", { name: /Add band/ }))
    expect(onChange).toHaveBeenLastCalledWith([...BANDS, { min: 0, grade: "" }])
    expect(screen.getByTestId("grading-error").textContent).toBe("Bands overlap.")
  })
})

describe("SchoolLogoField", () => {
  const png = () => new File(["x"], "logo.png", { type: "image/png" })

  it("converts, uploads into the school's folder and saves the key", async () => {
    const converted = new File(["y"], "logo.jpg", { type: "image/jpeg" })
    jpeg.convert.mockResolvedValue(converted)
    storage.upload.mockResolvedValue({ objectKey: "school-logos/7/abc.jpg", fileUrl: null, url: null })
    svc.update.mockResolvedValue({ ...SCHOOL, logo: "school-logos/7/abc.jpg", logoUrl: "https://signed/logo" })
    wrap(<SchoolLogoField school={SCHOOL} />)
    expect(screen.getByRole("button", { name: /Upload/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Choose school logo"), { target: { files: [png()] } })
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith({ logo: "school-logos/7/abc.jpg" }))
    expect(storage.upload).toHaveBeenCalledWith(converted, "school-logos/7")
  })

  it("rejects a wrong file type before uploading", () => {
    wrap(<SchoolLogoField school={SCHOOL} />)
    fireEvent.change(screen.getByLabelText("Choose school logo"), {
      target: { files: [new File(["x"], "logo.gif", { type: "image/gif" })] },
    })
    expect(screen.getByRole("alert").textContent).toContain("JPG, PNG or WebP")
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it("removes the current logo", async () => {
    svc.update.mockResolvedValue({ ...SCHOOL })
    wrap(<SchoolLogoField school={{ ...SCHOOL, logo: "school-logos/7/a.jpg", logoUrl: "https://signed/a" }} />)
    expect(screen.getByAltText("School logo preview").getAttribute("src")).toBe("https://signed/a")
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }))
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith({ logo: null }))
  })

  it("shows an upload failure", async () => {
    jpeg.convert.mockResolvedValue(png())
    storage.upload.mockRejectedValue(new Error("The file could not be uploaded. Try again."))
    wrap(<SchoolLogoField school={SCHOOL} />)
    fireEvent.change(screen.getByLabelText("Choose school logo"), { target: { files: [png()] } })
    expect(await screen.findByText("The file could not be uploaded. Try again.")).toBeTruthy()
    expect(svc.update).not.toHaveBeenCalled()
  })
})
