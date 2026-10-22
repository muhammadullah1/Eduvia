export type FileRules = {
  /** MIME types accepted, e.g. ["image/png"]. */
  types: readonly string[]
  maxBytes: number
  /** Human wording for the hint and errors, e.g. "JPG or PNG". */
  label: string
}

const MB = 1024 * 1024

/** Profile photos. */
export const IMAGE_RULES: FileRules = {
  types: ["image/jpeg", "image/png"],
  maxBytes: 2 * MB,
  label: "JPG or PNG",
}

/** Admission and other record documents: images or common document types. */
export const DOCUMENT_RULES: FileRules = {
  types: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  maxBytes: 10 * MB,
  label: "PDF, Word, JPG, PNG or WebP",
}

/** Checked before anything is uploaded; the API checks type and folder again. */
export function fileRuleError(file: File, rules: FileRules): string | null {
  if (!rules.types.includes(file.type)) return `Use a ${rules.label} file.`
  if (file.size > rules.maxBytes) {
    return `File is too large. The limit is ${rules.maxBytes / MB} MB.`
  }
  return null
}
