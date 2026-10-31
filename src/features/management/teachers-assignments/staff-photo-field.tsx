import { AvatarUploadField } from "@/components/app/avatar-upload-field"
import { IMAGE_RULES } from "@/lib/file-rules"

type Props = {
  file: File | null
  onFileChange: (file: File | null) => void
  /** Current photo display URL (signed link from the API). */
  currentUrl?: string | null
  onRemoveCurrent?: () => void
  disabled?: boolean
  /** For the initials shown when there is no photo. */
  name?: string
}

/** Optional profile photo for staff create/edit forms; uploaded on save. */
export function StaffPhotoField({ file, onFileChange, currentUrl, onRemoveCurrent, disabled, name }: Props) {
  return (
    <AvatarUploadField
      className="sm:col-span-2"
      label="Profile photo"
      name={name}
      rules={IMAGE_RULES}
      file={file}
      onFileChange={onFileChange}
      currentUrl={currentUrl}
      onRemoveCurrent={onRemoveCurrent}
      disabled={disabled}
    />
  )
}
