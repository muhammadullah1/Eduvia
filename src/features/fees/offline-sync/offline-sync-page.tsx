import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Check, CheckCircle2, CloudUpload, Download, FileSpreadsheet, Loader2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import feeImportService, {
  IMPORT_EXTENSIONS,
  IMPORT_HISTORY_KEY,
  type ImportBatch,
  type ImportResult,
  type ImportRow,
} from "@/api/fees/fee-import.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useCan } from "@/lib/access"
import { cn } from "@/lib/utils"

import { formatPkr, newIdempotencyKey } from "../collect/collect-rules"
import { fileProblem, IMPORT_RULES, pillCounts, rowLabel, rowTone, stamp, SYNC_STEPS } from "./offline-sync-rules"

const brandButton = "bg-[var(--cls-brand)] text-white hover:bg-[var(--cls-brand-hover)]"

function errorText(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Something went wrong. Please try again."
}

/** Steps 1–7 (Figma 127-74395). `current` is 1-based. */
function Stepper({ current }: { current: number }) {
  return (
    <div data-testid="sync-stepper">
      <ol className="hidden items-start md:flex" aria-label="Offline sync progress">
        {SYNC_STEPS.map((label, i) => {
          const n = i + 1
          const done = n < current || (n === current && current === SYNC_STEPS.length)
          const active = n === current
          return (
            <li key={label} className="flex flex-1 items-start last:flex-none" aria-current={active ? "step" : undefined}>
              <div className="flex w-24 flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border text-xs font-semibold",
                    done || active ? "border-[var(--cls-brand)] bg-[var(--cls-brand)] text-white" : "border-[var(--cls-border)] bg-white text-[var(--cls-muted)]"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : n}
                </span>
                <span className={cn("text-[11px] leading-tight", active || done ? "font-medium text-[var(--cls-brand)]" : "text-[var(--cls-muted)]")}>{label}</span>
              </div>
              {n < SYNC_STEPS.length ? (
                <span className={cn("mt-3.5 h-0.5 min-w-3 flex-1", n < current ? "bg-[var(--cls-brand)]" : "bg-[var(--cls-border)]")} aria-hidden />
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="md:hidden">
        <p className="text-xs text-[var(--cls-muted)]">
          Step {current} of {SYNC_STEPS.length}
        </p>
        <p className="text-sm font-semibold text-[var(--cls-brand)]">{SYNC_STEPS[current - 1]}</p>
        <div className="mt-2 flex gap-1" aria-hidden>
          {SYNC_STEPS.map((label, i) => (
            <span key={label} className={cn("h-1 flex-1 rounded-full", i < current ? "bg-[var(--cls-brand)]" : "bg-[var(--cls-border)]")} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Pills({ batch }: { batch: ImportBatch }) {
  const c = pillCounts(batch)
  const committed = batch.status === "Committed"
  return (
    <div className="flex flex-wrap gap-2" data-testid="sync-pills">
      <StatusChip tone="success" showDot className="px-3 py-1 text-xs">
        {c.valid} {committed ? "Imported" : "Valid"}
      </StatusChip>
      <StatusChip tone="warning" showDot className="px-3 py-1 text-xs">
        {c.skipped} Skipped
      </StatusChip>
      <StatusChip tone="danger" showDot className="px-3 py-1 text-xs">
        {c.failed} Failed
      </StatusChip>
    </div>
  )
}

function Reason({ row }: { row: ImportRow }) {
  if (row.status === "Imported" && row.receiptNo) return <span>Imported as {row.receiptNo}</span>
  return <span>{row.reasons.length ? row.reasons.join(" ") : "—"}</span>
}

/** Row table on md+, stacked cards below (no sideways scrolling at 390). */
function RowsTable({ rows }: { rows: ImportRow[] }) {
  return (
    <ClsPanel>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className={clsHeadRowClass}>
              <ClsTh className="w-12">Row</ClsTh>
              <ClsTh className="w-[10%]">Student ID</ClsTh>
              <ClsTh className="w-[13%]">Student Name</ClsTh>
              <ClsTh className="w-[7%]">Class</ClsTh>
              <ClsTh className="w-[8%]">Month</ClsTh>
              <ClsTh className="w-[8%]">Amount</ClsTh>
              <ClsTh className="w-[11%]">Receipt Ref</ClsTh>
              <ClsTh className="w-36">Status</ClsTh>
              <ClsTh>Reason</ClsTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.rowNumber} className={clsRowClass} data-testid="sync-row">
                <TableCell className="text-[var(--cls-muted)]">{r.rowNumber}</TableCell>
                <TableCell className="truncate text-xs text-[var(--cls-muted)]" title={r.admissionNo ?? ""}>{r.admissionNo || "—"}</TableCell>
                <TableCell className="truncate font-medium" title={r.studentName ?? ""}>{r.studentName || "—"}</TableCell>
                <TableCell className="truncate">{r.className || "—"}</TableCell>
                <TableCell>{r.month || "—"}</TableCell>
                <TableCell className="font-medium text-[var(--cls-brand)]">{r.amount != null ? formatPkr(r.amount) : "—"}</TableCell>
                <TableCell className="truncate text-xs text-[var(--cls-muted)]" title={r.referenceNo ?? ""}>{r.referenceNo || "—"}</TableCell>
                <TableCell>
                  <StatusChip tone={rowTone(r.status)}>{rowLabel(r.status)}</StatusChip>
                </TableCell>
                <TableCell className="text-xs whitespace-normal text-[var(--cls-muted)]">
                  <Reason row={r} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y divide-[var(--cls-border)] md:hidden">
        {rows.map((r) => (
          <li key={r.rowNumber} className="flex flex-col gap-1 px-4 py-3 text-sm" data-testid="sync-row-card">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium text-[var(--cls-ink)]">
                Row {r.rowNumber} · {r.studentName || r.admissionNo || "—"}
              </span>
              <StatusChip tone={rowTone(r.status)}>{rowLabel(r.status)}</StatusChip>
            </div>
            <p className="break-words text-xs text-[var(--cls-muted)]">
              {[r.admissionNo, r.className, r.month, r.referenceNo].filter(Boolean).join(" · ") || "—"}
              {r.amount != null ? <span className="font-medium text-[var(--cls-brand)]"> · PKR {formatPkr(r.amount)}</span> : null}
            </p>
            {r.reasons.length || r.receiptNo ? (
              <p className="break-words text-xs text-[var(--cls-ink)]">
                <Reason row={r} />
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </ClsPanel>
  )
}

function History({ onError }: { onError: (batchId: number) => void }) {
  const history = useQuery({ queryKey: IMPORT_HISTORY_KEY, queryFn: () => feeImportService.history(20) })
  const batches = (history.data ?? []).filter((b) => b.status === "Committed")
  return (
    <section className="flex flex-col gap-3" aria-labelledby="sync-history-title">
      <h2 id="sync-history-title" className="text-sm font-semibold text-[var(--cls-brand)]">
        Sync History
      </h2>
      <ClsPanel>
        {history.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        ) : history.isError ? (
          <ClsEmpty title="Could not load sync history">{errorText(history.error)}</ClsEmpty>
        ) : batches.length === 0 ? (
          <ClsEmpty title="No files synced yet">Imported files appear here with their results.</ClsEmpty>
        ) : (
          <>
            <div className="hidden md:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className={clsHeadRowClass}>
                    <ClsTh className="w-[18%]">Timestamp</ClsTh>
                    <ClsTh className="w-[30%]">Filename</ClsTh>
                    <ClsTh>Successful</ClsTh>
                    <ClsTh>Skipped</ClsTh>
                    <ClsTh>Failed</ClsTh>
                    <ClsTh className="w-32">
                      <span className="sr-only">Error report</span>
                    </ClsTh>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id} className={clsRowClass} data-testid="history-row">
                      <TableCell className="text-[var(--cls-muted)]">{stamp(b.committedAt || b.createdAt)}</TableCell>
                      <TableCell className="truncate" title={b.fileName}>{b.fileName}</TableCell>
                      <TableCell className="font-semibold text-[var(--cls-brand)]">{b.importedRows}</TableCell>
                      <TableCell className={b.skippedRows ? "text-amber-700" : "text-[var(--cls-muted)]"}>{b.skippedRows}</TableCell>
                      <TableCell className={b.failedRows ? "text-red-700" : "text-[var(--cls-muted)]"}>{b.failedRows}</TableCell>
                      <TableCell>
                        {b.hasErrorReport ? (
                          <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => onError(b.id)}>
                            Error report
                          </button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-[var(--cls-border)] md:hidden">
              {batches.map((b) => (
                <li key={b.id} className="flex flex-col gap-1 px-4 py-3 text-sm" data-testid="history-card">
                  <span className="break-all font-medium text-[var(--cls-ink)]">{b.fileName}</span>
                  <span className="text-xs text-[var(--cls-muted)]">{stamp(b.committedAt || b.createdAt)}</span>
                  <span className="text-xs">
                    <span className="font-semibold text-[var(--cls-brand)]">{b.importedRows} successful</span> ·{" "}
                    <span className="text-amber-700">{b.skippedRows} skipped</span> · <span className="text-red-700">{b.failedRows} failed</span>
                  </span>
                  {b.hasErrorReport ? (
                    <button type="button" className="self-start text-xs text-blue-700 hover:underline" onClick={() => onError(b.id)}>
                      Error report
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </ClsPanel>
    </section>
  )
}

/**
 * Offline Sync (Figma 127-74395): template → rules → upload → validate → results →
 * confirm → summary, with Sync History below. The server validates every rule; nothing
 * is written to the ledger until "Confirm Import", which is idempotent per batch.
 */
export function OfflineSyncPage() {
  const can = useCan()
  const seesTotals = can("fees.totals")
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const commitKey = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: IMPORT_HISTORY_KEY })

  const template = useMutation({
    mutationFn: feeImportService.template,
    onSuccess: (name) => toast.success(`Downloaded ${name}`),
    onError: (e) => toast.error(errorText(e)),
  })
  const report = useMutation({
    mutationFn: feeImportService.errorReport,
    onSuccess: (name) => toast.success(`Downloaded ${name}`),
    onError: (e) => toast.error(errorText(e)),
  })
  const validate = useMutation({
    mutationFn: feeImportService.validate,
    onSuccess: (data) => {
      setProgress(100)
      setResult(data)
      commitKey.current = null
      setStep(5)
      refreshHistory()
    },
    onError: (e) => {
      setFileError(errorText(e))
      setStep(3)
    },
  })
  const commit = useMutation({
    mutationFn: ({ id, key }: { id: number; key: string }) => feeImportService.commit(id, key),
    onSuccess: (data) => {
      setResult(data)
      setStep(7)
      refreshHistory()
      queryClient.invalidateQueries({ queryKey: ["fees"] })
      toast.success("Sync complete")
    },
    onError: (e) => toast.error(errorText(e)),
  })
  const discard = useMutation({ mutationFn: feeImportService.discard, onSettled: refreshHistory })

  // Validation progress: the request is a single call, so ease towards 90% until it returns.
  useEffect(() => {
    if (step !== 4) return undefined
    const t = setInterval(() => setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) / 8) : p)), 150)
    return () => clearInterval(t)
  }, [step])

  function pick(next: File | undefined | null) {
    if (!next) return
    const problem = fileProblem(next)
    setFileError(problem)
    setFile(problem ? null : next)
  }

  function startValidation() {
    const problem = fileProblem(file)
    if (problem || !file) {
      setFileError(problem)
      return
    }
    setProgress(5)
    setStep(4)
    validate.mutate(file)
  }

  function startOver() {
    if (result?.batch.status === "Validated") discard.mutate(result.batch.id)
    setResult(null)
    setFile(null)
    setFileError(null)
    setProgress(0)
    commitKey.current = null
    setStep(3)
  }

  function confirmImport() {
    if (!result) return
    // One key per batch: a retry after a network error replays instead of importing twice.
    commitKey.current ??= `ui-${result.batch.id}-${newIdempotencyKey()}`
    commit.mutate({ id: result.batch.id, key: commitKey.current })
  }

  const batch = result?.batch
  const validCount = batch?.validRows ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="offline-sync-page">
      <ClsPanel className="flex flex-col gap-6 p-4 sm:p-5">
        <Stepper current={step} />

        {step === 1 ? (
          <div className="flex flex-col gap-4" data-testid="step-template">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--cls-brand)]/10 text-[var(--cls-brand)]">
                <FileSpreadsheet className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--cls-ink)]">Download the fee collection template</p>
                <p className="text-sm text-[var(--cls-muted)]">
                  Columns: Admission Number, Student Name, Class, Month(s), Amount, Payment Date, Receipt/Reference No., Payment Method, Notes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => template.mutate()} disabled={template.isPending}>
                {template.isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}
                Download Template
              </Button>
              <Button className={brandButton} onClick={() => setStep(2)}>
                Next <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4" data-testid="step-rules">
            <p className="font-semibold text-[var(--cls-ink)]">Validation rules</p>
            <ul className="flex flex-col gap-2 text-sm text-[var(--cls-ink)]">
              {IMPORT_RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--cls-brand)]" aria-hidden />
                  <span className="min-w-0">{rule}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className={brandButton} onClick={() => setStep(3)}>
                Continue to Upload <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4" data-testid="step-upload">
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload Excel file"
              data-testid="sync-dropzone"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                pick(e.dataTransfer.files?.[0])
              }}
              className={cn(
                "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                dragging ? "border-[var(--cls-brand)] bg-[var(--cls-brand)]/5" : "border-[var(--cls-border)] bg-[var(--page-wash)]/60",
                fileError && "border-red-300"
              )}
            >
              <CloudUpload className="size-6 text-[var(--cls-brand)]" aria-hidden />
              <p className="text-sm font-medium text-[var(--cls-ink)]">Drag and drop the filled template here</p>
              <p className="text-xs text-[var(--cls-muted)]">or click to browse · {IMPORT_EXTENSIONS.join(", ")} up to 700 KB</p>
              <input
                ref={inputRef}
                type="file"
                accept={IMPORT_EXTENSIONS.join(",")}
                className="sr-only"
                data-testid="sync-file-input"
                aria-label="Excel file"
                onChange={(e) => {
                  const next = e.target.files?.[0]
                  e.target.value = ""
                  pick(next)
                }}
              />
            </div>
            {file ? (
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--cls-border)] px-3 py-2 text-sm">
                <FileSpreadsheet className="size-4 shrink-0 text-[var(--cls-brand)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate" data-testid="sync-file-name">{file.name}</span>
                <span className="shrink-0 text-xs text-[var(--cls-muted)]">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => setFile(null)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : null}
            {fileError ? (
              <p className="text-sm text-red-700" role="alert" data-testid="sync-file-error">
                {fileError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className={brandButton} onClick={startValidation} disabled={!file}>
                Validate File <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-3" data-testid="step-validating" aria-live="polite">
            <p className="flex items-center gap-2 font-medium text-[var(--cls-ink)]">
              <Loader2 className="size-4 animate-spin text-[var(--cls-brand)]" aria-hidden />
              Validating {file?.name}…
            </p>
            <Progress value={progress} className="h-2 [&>[data-slot=progress-indicator]]:bg-[var(--cls-brand)]" aria-label="Validation progress" />
            <p className="text-xs text-[var(--cls-muted)]">Checking students, months, amounts, dates and duplicate receipts. Nothing is saved to the ledger yet.</p>
          </div>
        ) : null}

        {step === 5 && batch && result ? (
          <div className="flex flex-col gap-4" data-testid="step-results">
            <Pills batch={batch} />
            {result.previousImport ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="sync-previous">
                This exact file was already imported on {stamp(result.previousImport.committedAt)}. Rows already in the system are skipped.
              </p>
            ) : null}
            <RowsTable rows={result.rows} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={startOver}>
                Start Over
              </Button>
              {batch.skippedRows + batch.failedRows > 0 ? (
                <Button variant="outline" onClick={() => report.mutate(batch.id)} disabled={report.isPending}>
                  <Download data-icon="inline-start" /> Download Error Report
                </Button>
              ) : null}
              <Button className={brandButton} onClick={() => setStep(6)} disabled={validCount === 0}>
                Import {validCount} Valid {validCount === 1 ? "Row" : "Rows"} <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 6 && batch ? (
          <div className="flex flex-col gap-4" data-testid="step-confirm">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Confirm import of {validCount} {validCount === 1 ? "payment" : "payments"} from {batch.fileName}</p>
              <ul className="mt-2 list-disc pl-5">
                <li>Each row becomes a receipt, allocated to the oldest unpaid month first.</li>
                <li>Money beyond what a student owes is kept as student credit; future months are not pre-paid.</li>
                <li>
                  {batch.skippedRows} skipped and {batch.failedRows} failed {batch.skippedRows + batch.failedRows === 1 ? "row is" : "rows are"} not imported.
                </li>
                {seesTotals && batch.validAmount != null ? <li>Total to import: PKR {formatPkr(batch.validAmount)}</li> : null}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(5)} disabled={commit.isPending}>
                Back
              </Button>
              <Button className={brandButton} onClick={confirmImport} disabled={commit.isPending}>
                {commit.isPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                Confirm Import
              </Button>
            </div>
          </div>
        ) : null}

        {step === 7 && batch && result ? (
          <div className="flex flex-col items-center gap-4 text-center" data-testid="step-summary">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--cls-brand)] text-white">
              <Check className="size-6" />
            </span>
            <div>
              <p className="text-lg font-semibold text-[var(--cls-ink)]">Sync Complete</p>
              <p className="text-sm break-all text-[var(--cls-muted)]">{batch.fileName}</p>
            </div>
            <div className="grid w-full max-w-md grid-cols-3 gap-2" data-testid="summary-counts">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xl font-semibold text-emerald-800">{batch.importedRows}</p>
                <p className="text-xs text-emerald-800">Successful</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xl font-semibold text-amber-800">{batch.skippedRows}</p>
                <p className="text-xs text-amber-800">Skipped</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xl font-semibold text-red-800">{batch.failedRows}</p>
                <p className="text-xs text-red-800">Failed</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {batch.hasErrorReport ? (
                <Button variant="outline" onClick={() => report.mutate(batch.id)} disabled={report.isPending}>
                  <Download data-icon="inline-start" /> Download Error Report
                </Button>
              ) : null}
              <Button className={brandButton} onClick={startOver}>
                Sync Another File
              </Button>
            </div>
            <div className="w-full text-left">
              <RowsTable rows={result.rows} />
            </div>
          </div>
        ) : null}
      </ClsPanel>

      <History onError={(id) => report.mutate(id)} />
    </div>
  )
}

export default OfflineSyncPage
