import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"

import applicationsService from "@/api/admissions/applications.service"
import { Button } from "@/components/ui/button"
import type { AdmissionDocument } from "@/data/types"
import { applicationNumericId } from "@/lib/applications-api"
import { AdmissionDocumentViewButton } from "@/features/management/admissions/admission-document-preview"
import { toast } from "@/lib/toast"

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp"

type Props = {
  applicationId: string | null
  document: AdmissionDocument
  onUpdated: (doc: AdmissionDocument) => void
  onEnsureApplication: () => Promise<string | null>
}

function mimeForFile(file: File) {
  if (file.type) return file.type
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  return "image/jpeg"
}

export function AdmissionDocumentUpload({
  applicationId,
  document,
  onUpdated,
  onEnsureApplication,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    const appId = applicationId ?? (await onEnsureApplication())
    const numericId = appId ? applicationNumericId(appId) : null
    const docNumericId = Number(document.id)
    if (!numericId || !Number.isFinite(docNumericId)) {
      toast.error("Save the application draft before uploading documents.")
      return
    }
    const contentType = mimeForFile(file)
    setUploading(true)
    try {
      const presign = await applicationsService.presignDocument(numericId, {
        documentId: docNumericId,
        contentType,
        fileName: file.name,
      })
      if (file.size > presign.maxBytes) {
        toast.error("File is too large (max 10 MB).")
        return
      }
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      })
      if (!put.ok) {
        toast.error("Upload failed. Try again.")
        return
      }
      onUpdated({
        ...document,
        status: "Uploaded",
        fileUrl: presign.fileUrl,
      })
      toast.success("Document uploaded.")
    } catch {
      toast.error("Could not upload document.")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleRemove() {
    const appId = applicationId
    const numericId = appId ? applicationNumericId(appId) : null
    const docNumericId = Number(document.id)
    if (!numericId || !Number.isFinite(docNumericId)) return
    setUploading(true)
    try {
      await applicationsService.clearDocument(numericId, docNumericId)
      onUpdated({ ...document, status: "Pending", fileUrl: null })
      toast.message("Document removed.")
    } catch {
      toast.error("Could not remove document.")
    } finally {
      setUploading(false)
    }
  }

  const hasFile =
    document.status !== "Pending" &&
    document.fileUrl &&
    document.fileUrl.startsWith("http")

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      {hasFile ? (
        <AdmissionDocumentViewButton
          title={document.label}
          fileUrl={document.fileUrl!}
        />
      ) : null}
      <Button
        type="button"
        size="sm"
        className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload data-icon="inline-start" />
        )}
        {hasFile ? "Replace" : "Upload"}
      </Button>
      {hasFile ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={uploading}
          onClick={() => void handleRemove()}
        >
          Remove
        </Button>
      ) : null}
    </div>
  )
}
