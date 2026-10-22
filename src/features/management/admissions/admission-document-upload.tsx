import { FileUploadField } from "@/components/app/file-upload-field"
import type { AdmissionDocument } from "@/data/types"
import { applicationNumericId } from "@/lib/applications-api"
import { DOCUMENT_RULES } from "@/lib/file-rules"

import { AdmissionDocumentViewButton } from "./admission-document-preview"

type Props = {
  applicationId: string | null
  document: AdmissionDocument
  /** Local change only; the wizard uploads and saves on Continue. */
  onChange: (doc: AdmissionDocument) => void
}

function hasStoredFile(document: AdmissionDocument) {
  return document.status !== "Pending" && Boolean(document.fileUrl) && !document.fileUrl?.startsWith("pending://")
}

/** One admission document: the shared picker plus a preview button. */
export function AdmissionDocumentUpload({ applicationId, document, onChange }: Props) {
  const stored = hasStoredFile(document)
  const appId = applicationId ? applicationNumericId(applicationId) : null
  const pending = document.pendingFile ?? null

  return (
    <div className="flex w-full items-start gap-2 sm:w-[22rem]">
      <div className="min-w-0 flex-1">
        <FileUploadField
          rules={DOCUMENT_RULES}
          file={pending}
          onFileChange={(file) => onChange({ ...document, pendingFile: file })}
          storedName={stored ? "Uploaded file" : null}
          onRemoveStored={() => onChange({ ...document, status: "Pending", fileUrl: null, pendingFile: null })}
          aria-label={`Upload ${document.label}`}
        />
      </div>
      {pending || (stored && appId) ? (
        <AdmissionDocumentViewButton
          title={document.label}
          file={pending}
          stored={!pending && appId ? { applicationId: appId, documentId: Number(document.id) } : null}
        />
      ) : null}
    </div>
  )
}
