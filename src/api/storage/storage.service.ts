import { api } from "@/lib/api"

export type PresignedUpload = {
  uploadUrl: string
  fileUrl: string | null
  objectKey: string
  bucket: string
  contentType: string
  contentLength: number
  expiresIn: number
}

export type StoredFile = {
  objectKey: string
  /** Public URL when the bucket has a public base URL, else null. */
  fileUrl: string | null
  /** Best URL to show right after upload (public URL or the key resolved). */
  url: string | null
}

const PUBLIC_BASE = String(import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "")

function extensionOf(name: string) {
  const match = /\.([a-z0-9]{1,8})$/i.exec(name)
  return match ? `.${match[1].toLowerCase()}` : ""
}

/**
 * Display URL for a stored value: http(s) and blob: URLs pass through; an
 * object key becomes `VITE_R2_PUBLIC_BASE_URL/key`, or null when no public
 * base is configured (private files are opened through signed API links).
 */
export function resolveStorageUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^(https?:|blob:)/i.test(value)) return value
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${value.replace(/^\/+/, "")}` : null
}

/**
 * Uploads straight to R2: ask the API for a presigned PUT, then send the
 * file with the same Content-Type and no auth header (the signature is the
 * credential). The file size is signed too, so R2 refuses any other body and
 * the API refuses to sign a file over the folder's limit. The R2 bucket's
 * CORS must allow PUT from the portal origin.
 */
export async function uploadFileToStorage(file: File, dirName: string): Promise<StoredFile> {
  const contentType = file.type || "application/octet-stream"
  const presigned = await api.post<PresignedUpload>("/auth/get-presigned-url", {
    dirName,
    fileName: `${crypto.randomUUID()}${extensionOf(file.name)}`,
    contentType,
    contentLength: file.size,
  })
  const put = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  })
  if (!put.ok) throw new Error("The file could not be uploaded. Try again.")
  return {
    objectKey: presigned.objectKey,
    fileUrl: presigned.fileUrl,
    url: presigned.fileUrl ?? resolveStorageUrl(presigned.objectKey),
  }
}

/** Upload folders, one per feature. */
export const STORAGE_DIRS = {
  avatars: "avatars",
  schoolLogo: (schoolId: number) => `school-logos/${schoolId}`,
  studentPhotos: (studentId: number) => `students/${studentId}/photos`,
  admissionDocuments: (applicationId: number) => `admissions/${applicationId}/documents`,
} as const
