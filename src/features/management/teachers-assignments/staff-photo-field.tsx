import { FileUploadField } from "@/components/app/file-upload-field"
import { Label } from "@/components/ui/label"
import { IMAGE_RULES } from "@/lib/file-rules"

type Props = {
  file: File | null
  onFileChange: (file: File | null) => void
  /** Current photo display URL (signed link from the API). */
  currentUrl?: string | null
  onRemoveCurrent?: () => void
  disabled?: boolean
}

/** Optional profile photo for staff create/edit forms; uploaded on save. */
export function StaffPhotoField({ file, onFileChange, currentUrl, onRemoveCurrent, disabled }: Props) {
  return (
    <div className="sm:col-span-2">
      <Label htmlFor="staff-photo" className="mb-1.5 block text-sm font-medium">
        Profile photo <span className="text-[var(--cls-muted)]">(optional)</span>
      </Label>
      <FileUploadField
        id="staff-photo"
        rules={IMAGE_RULES}
        imagePreview
        file={file}
        onFileChange={onFileChange}
        storedName={currentUrl ? "Current photo" : null}
        storedPreviewUrl={currentUrl}
        onRemoveStored={onRemoveCurrent}
        disabled={disabled}
      />
    </div>
  )
}
