import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { STORAGE_DIRS, uploadFileToStorage } from "@/api/storage/storage.service"
import studentsService from "@/api/students/students.service"
import { AvatarUploadField } from "@/components/app/avatar-upload-field"
import type { ApiStudentDetail } from "@/lib/api-types"
import { IMAGE_RULES } from "@/lib/file-rules"
import { toast } from "@/lib/toast"

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  return "Could not save the photo."
}

type Props = {
  student: ApiStudentDetail
  name: string
}

/** Managers: upload, change or remove a student's photo. Saves at once; the old file is removed by the API. */
export function StudentPhotoField({ student, name }: Props) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async (file: File | null) => {
      let photo: string | null = null
      if (file) photo = (await uploadFileToStorage(file, STORAGE_DIRS.studentPhotos(student.id))).objectKey
      return studentsService.setPhoto(student.id, photo)
    },
    onSuccess: (saved, file) => {
      setError(null)
      queryClient.setQueryData(["students", "detail", student.id], saved)
      if (file) toast.success("Photo saved")
      if (!file) toast.success("Photo removed")
    },
    onError: (err) => setError(errorMessage(err)),
  })

  return (
    <div className="flex flex-col gap-1">
      <AvatarUploadField
        label="Student photo"
        name={name}
        rules={IMAGE_RULES}
        file={null}
        onFileChange={(file) => file && save.mutate(file)}
        currentUrl={student.photoUrl}
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
