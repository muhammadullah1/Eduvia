import { api } from "@/lib/api"

/** Offline Sync (Finance Step 7): validate a filled template, review, import the valid rows. */
export type ImportRowStatus = "Valid" | "Error" | "Duplicate" | "Imported" | "Skipped"

export type ImportBatch = {
  id: number
  fileName: string
  fileHash: string
  status: "Validated" | "Committing" | "Committed" | "Failed" | "Discarded" | string
  createdAt: string
  committedAt: string | null
  uploadedBy: string | null
  totalRows: number
  validRows: number
  importedRows: number
  skippedRows: number
  failedRows: number
  hasErrorReport: boolean
  /** Super Admin only (`fees.totals`); the Accountant gets counts. */
  validAmount?: number
}

export type ImportRow = {
  rowNumber: number
  admissionNo: string | null
  studentName: string | null
  className: string | null
  month: string | null
  amount: number | null
  paymentDate: string | null
  referenceNo: string | null
  paymentMethod: string | null
  status: ImportRowStatus
  reasons: string[]
  receiptNo: string | null
}

export type ImportResult = {
  batch: ImportBatch
  rows: ImportRow[]
  /** Set when this exact file was already imported before. */
  previousImport?: { batchId: number; committedAt: string | null } | null
}

export const IMPORT_HISTORY_KEY = ["fees", "imports"] as const
/** Matches the server limits (700 KB, 1,000 rows, .xlsx/.xls). */
export const IMPORT_MAX_BYTES = 700 * 1024
export const IMPORT_MAX_ROWS = 1000
export const IMPORT_EXTENSIONS = [".xlsx", ".xls"]

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the file."))
    reader.onload = () => {
      const url = String(reader.result || "")
      resolve(url.slice(url.indexOf(",") + 1))
    }
    reader.readAsDataURL(file)
  })
}

const feeImportService = {
  template: () => api.download("/fees/import-template", undefined, "fee-import-template.xlsx"),
  validate: async (file: File) =>
    api.post<ImportResult>("/fees/imports/validate", { fileName: file.name, contentBase64: await fileToBase64(file) }),
  commit: (batchId: number, idempotencyKey: string) =>
    api.post<ImportResult>(`/fees/imports/${batchId}/commit`, undefined, { "Idempotency-Key": idempotencyKey }),
  discard: (batchId: number) => api.post<ImportResult>(`/fees/imports/${batchId}/discard`),
  detail: (batchId: number) => api.get<ImportResult>(`/fees/imports/${batchId}`),
  history: (limit = 20) => api.get<ImportBatch[]>("/fees/imports", { limit }),
  errorReport: (batchId: number) =>
    api.download(`/fees/imports/${batchId}/error-report`, undefined, `fee-import-errors-${batchId}.xlsx`),
}

export default feeImportService
