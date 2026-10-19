import { useEffect, useState } from "react"

import usersService from "@/api/users/users.service"
import { Label } from "@/components/ui/label"

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 2 * 1024 * 1024

type Props = {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  onError: (message: string | null) => void
}

export function StaffPhotoField({ value, onChange, disabled, onError }: Props) {
  const [preview, setPreview] = useState(value)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setPreview(value)
  }, [value])

  async function onFile(file: File | undefined) {
    onError(null)
    if (!file) return
    if (!ALLOWED.has(file.type)) {
      onError("Use a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      onError("Profile photos must be 2 MB or smaller.")
      return
    }
    const local = URL.createObjectURL(file)
    setPreview(local)
    setUploading(true)
    try {
      const presign = await usersService.presignPhoto({
        contentType: file.type,
        fileName: file.name,
      })
      if (file.size > presign.maxBytes) {
        onError("Profile photos must be 2 MB or smaller.")
        setPreview(value)
        return
      }
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!put.ok) {
        throw new Error("Upload failed")
      }
      onChange(presign.fileUrl)
      setPreview(presign.fileUrl)
    } catch (err) {
      setPreview(value)
      onError(
        err instanceof Error ? err.message : "Could not upload the profile photo."
      )
    } finally {
      URL.revokeObjectURL(local)
      setUploading(false)
    }
  }

  return (
    <div className="sm:col-span-2">
      <Label className="mb-1.5 block text-sm font-medium">Profile photo</Label>
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--cls-border)] bg-[var(--page-wash)]">
          {preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-[10px] text-[var(--cls-muted)]">None</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void onFile(file)
            }}
            className="block w-full text-sm text-[var(--cls-ink)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--cls-brand)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
          <p className="mt-1 text-xs text-[var(--cls-muted)]">
            {uploading ? "Uploading…" : "JPEG, PNG, or WebP. 2 MB maximum."}
          </p>
        </div>
      </div>
    </div>
  )
}
