import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { IMAGE_RULES } from "@/lib/file-rules"

import { AvatarUploadField } from "./avatar-upload-field"

const MB = 1024 * 1024

beforeAll(() => {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview")
  globalThis.URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

const choose = (file: File) =>
  fireEvent.change(screen.getByLabelText("Choose profile photo"), { target: { files: [file] } })

describe("AvatarUploadField", () => {
  it("shows initials and Upload when empty, then previews a picked photo", () => {
    const onFileChange = vi.fn()
    const { rerender } = render(
      <AvatarUploadField label="Profile photo" name="Sara Khan" rules={IMAGE_RULES} file={null} onFileChange={onFileChange} />
    )
    expect(screen.getByTestId("avatar-preview").textContent).toBe("SK")
    expect(screen.getByRole("button", { name: /Upload/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull()
    const photo = new File(["x"], "me.png", { type: "image/png" })
    choose(photo)
    expect(onFileChange).toHaveBeenCalledWith(photo)
    rerender(<AvatarUploadField label="Profile photo" name="Sara Khan" rules={IMAGE_RULES} file={photo} onFileChange={onFileChange} />)
    expect(screen.getByAltText("Profile photo preview").getAttribute("src")).toBe("blob:preview")
    expect(screen.getByRole("button", { name: /Change/ })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }))
    expect(onFileChange).toHaveBeenLastCalledWith(null)
  })

  it("rejects the wrong type and an oversized file", () => {
    const onFileChange = vi.fn()
    render(<AvatarUploadField label="Profile photo" rules={IMAGE_RULES} file={null} onFileChange={onFileChange} />)
    choose(new File(["x"], "a.gif", { type: "image/gif" }))
    expect(screen.getByRole("alert").textContent).toBe("Use a JPG or PNG file.")
    choose(new File([new Uint8Array(3 * MB)], "big.jpg", { type: "image/jpeg" }))
    expect(screen.getByRole("alert").textContent).toContain("too large")
    expect(onFileChange).not.toHaveBeenCalled()
  })

  it("removes the saved photo", () => {
    const onRemoveCurrent = vi.fn()
    render(
      <AvatarUploadField
        label="Profile photo"
        rules={IMAGE_RULES}
        file={null}
        onFileChange={vi.fn()}
        currentUrl="https://signed/me.jpg"
        onRemoveCurrent={onRemoveCurrent}
      />
    )
    expect(screen.getByAltText("Profile photo preview").getAttribute("src")).toBe("https://signed/me.jpg")
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }))
    expect(onRemoveCurrent).toHaveBeenCalled()
  })
})
