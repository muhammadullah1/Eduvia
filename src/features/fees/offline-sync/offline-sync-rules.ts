import type { ImportBatch, ImportRow } from "@/api/fees/fee-import.service"
import { IMPORT_EXTENSIONS, IMPORT_MAX_BYTES } from "@/api/fees/fee-import.service"
import type { StatusChipTone } from "@/components/app/status-chip"

export const SYNC_STEPS = [
  "Download Template",
  "Rules",
  "Upload File",
  "Validating",
  "Validation Results",
  "Confirm Import",
  "Sync Summary",
] as const

export const IMPORT_RULES = [
  "Use the downloaded template and keep its column headers unchanged.",
  "Student ID (admission number) must match an enrolled student; class, if filled, must match.",
  "Month(s) must be YYYY-MM and already billed on the student's ledger; future months are rejected.",
  "Amount must be a positive number (up to 2 decimals). Money beyond what is owed becomes student credit.",
  "Payment Date is YYYY-MM-DD and cannot be in the future.",
  "Every row needs a unique Receipt/Reference No.; receipts already in the system or repeated in the file are skipped.",
  "Payment Method is one of Cash, Bank Transfer, Cheque or Online.",
  `Excel files only (${IMPORT_EXTENSIONS.join(", ")}), up to ${Math.round(IMPORT_MAX_BYTES / 1024)} KB and 1,000 rows.`,
]

/** Client-side file check before upload; the server repeats every check. */
export function fileProblem(file: File | null | undefined): string | null {
  if (!file) return "Choose an Excel file to upload."
  const name = file.name.toLowerCase()
  if (!IMPORT_EXTENSIONS.some((ext) => name.endsWith(ext))) return "Only Excel files (.xlsx or .xls) can be imported."
  if (file.size === 0) return "The file is empty."
  if (file.size > IMPORT_MAX_BYTES) return `The file is larger than ${Math.round(IMPORT_MAX_BYTES / 1024)} KB.`
  return null
}

export function rowTone(status: ImportRow["status"]): StatusChipTone {
  if (status === "Valid" || status === "Imported") return "success"
  if (status === "Duplicate" || status === "Skipped") return "warning"
  return "danger"
}

export function rowLabel(status: ImportRow["status"]) {
  if (status === "Duplicate" || status === "Skipped") return "Skipped duplicate"
  if (status === "Error") return "Failed"
  return status
}

const METHOD_LABELS: Record<string, string> = { BankTransfer: "Bank Transfer", Cash: "Cash", Cheque: "Cheque", Online: "Online" }
export const methodText = (m: string | null) => (m ? (METHOD_LABELS[m] ?? m) : "—")

/** Valid / skipped / failed counts for the pills (before commit valid = ready, after = imported). */
export function pillCounts(batch: ImportBatch) {
  const committed = batch.status === "Committed"
  return {
    valid: committed ? batch.importedRows : batch.validRows,
    skipped: batch.skippedRows,
    failed: batch.failedRows,
  }
}

/** "2026-09-28 14:23" in the viewer's local time. */
export function stamp(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
