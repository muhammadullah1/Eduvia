import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import schoolCatalogService, { type SchoolProfile } from "@/api/settings/school-catalog.service"
import { STORAGE_DIRS, uploadFileToStorage } from "@/api/storage/storage.service"
import { AvatarUploadField } from "@/components/app/avatar-upload-field"
import { LOGO_RULES } from "@/lib/file-rules"
import { imageToJpeg } from "@/lib/image-to-jpeg"
import { toast } from "@/lib/toast"

/** Logos are stored small: enough for a letterhead, light for PDFs. */
const LOGO_SIZE = 256

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  return "Could not save the logo."
}

/** Super Admin: upload, change or remove the logo used on the sidebar, printouts, PDFs and Excel exports. Saves at once. */
export function SchoolLogoField({ school }: { school: SchoolProfile }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async (file: File | null) => {
      let logo: string | null = null
      if (file) {
        const jpeg = await imageToJpeg(file, LOGO_SIZE)
        logo = (await uploadFileToStorage(jpeg, STORAGE_DIRS.schoolLogo(school.id))).objectKey
      }
      return schoolCatalogService.updateCurrentSchool({ logo })
    },
    onSuccess: (saved, file) => {
      setError(null)
      queryClient.setQueryData(["schools", "current"], saved)
      if (file) toast.success("Logo saved")
      if (!file) toast.success("Logo removed")
    },
    onError: (err) => setError(errorMessage(err)),
  })

  return (
    <div className="flex flex-col gap-1">
      <AvatarUploadField
        label="School logo"
        name={school.name}
        shape="square"
        rules={LOGO_RULES}
        file={null}
        onFileChange={(file) => file && save.mutate(file)}
        currentUrl={school.logoUrl}
        onRemoveCurrent={() => save.mutate(null)}
        disabled={save.isPending}
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
