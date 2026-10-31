import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { ApiStudentDetail } from "@/lib/api-types"

import { StudentPhotoField } from "./student-photo-field"

const svc = vi.hoisted(() => ({ setPhoto: vi.fn() }))
const storage = vi.hoisted(() => ({ upload: vi.fn() }))

vi.mock("@/api/students/students.service", () => ({ default: { setPhoto: svc.setPhoto } }))
vi.mock("@/api/storage/storage.service", () => ({
  STORAGE_DIRS: { studentPhotos: (id: number) => `students/${id}/photos` },
  uploadFileToStorage: storage.upload,
}))
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const STUDENT: ApiStudentDetail = { id: 12, firstName: "Ayesha", lastName: "Khan", admissionNo: "A-1", status: "Active", fkClassId: 3 }

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview")
  URL.revokeObjectURL = vi.fn()
})
beforeEach(() => {
  svc.setPhoto.mockReset()
  storage.upload.mockReset()
})
afterEach(cleanup)

describe("StudentPhotoField", () => {
  const jpg = () => new File(["x"], "me.jpg", { type: "image/jpeg" })

  it("uploads into the student's folder and saves the key", async () => {
    storage.upload.mockResolvedValue({ objectKey: "students/12/photos/a.jpg" })
    svc.setPhoto.mockResolvedValue({ ...STUDENT, photo: "students/12/photos/a.jpg", photoUrl: "https://signed/a" })
    wrap(<StudentPhotoField student={STUDENT} name="Ayesha Khan" />)
    fireEvent.change(screen.getByLabelText("Choose student photo"), { target: { files: [jpg()] } })
    await waitFor(() => expect(svc.setPhoto).toHaveBeenCalledWith(12, "students/12/photos/a.jpg"))
    expect(storage.upload.mock.calls.at(0)?.at(1)).toBe("students/12/photos")
  })

  it("refuses a non-image before uploading", async () => {
    wrap(<StudentPhotoField student={STUDENT} name="Ayesha Khan" />)
    fireEvent.change(screen.getByLabelText("Choose student photo"), {
      target: { files: [new File(["x"], "cv.pdf", { type: "application/pdf" })] },
    })
    expect(await screen.findByRole("alert")).toBeTruthy()
    expect(storage.upload).not.toHaveBeenCalled()
  })

  it("shows the saved photo and removes it", async () => {
    svc.setPhoto.mockResolvedValue({ ...STUDENT, photo: null, photoUrl: null })
    wrap(<StudentPhotoField student={{ ...STUDENT, photo: "students/12/photos/a.jpg", photoUrl: "https://signed/a" }} name="Ayesha Khan" />)
    expect(screen.getByAltText("Student photo preview").getAttribute("src")).toBe("https://signed/a")
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }))
    await waitFor(() => expect(svc.setPhoto).toHaveBeenCalledWith(12, null))
  })

  it("reports an upload failure and saves nothing", async () => {
    storage.upload.mockRejectedValue(new Error("The file could not be uploaded. Try again."))
    wrap(<StudentPhotoField student={STUDENT} name="Ayesha Khan" />)
    fireEvent.change(screen.getByLabelText("Choose student photo"), { target: { files: [jpg()] } })
    expect(await screen.findByText("The file could not be uploaded. Try again.")).toBeTruthy()
    expect(svc.setPhoto).not.toHaveBeenCalled()
  })
})
