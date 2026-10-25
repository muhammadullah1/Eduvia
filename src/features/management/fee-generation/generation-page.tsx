import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Check,
  CheckCircle2,
  EyeOff,
  Info,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import generationService, {
  GENERATION_QUERY_KEY,
  type GenerationInput,
  type GenerationResult,
  LEDGER_QUERY_KEY,
} from "@/api/fees/generation.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { useClassesList } from "../classes/hooks/use-classes"
import { errorText } from "../fee-structure/fee-structure-rules"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import {
  currentMonthKey,
  extrasSummary,
  formatPkr,
  GENERATION_STEPS,
  type GenerationStep,
  monthTitle,
  plural,
} from "./generation-rules"
import { StudentLedgerView } from "./student-ledger"

const ALL = "all"
const brandButton = "bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"

/** Monthly Generation: pick a month, preview (dry run), confirm, generate. Opens sample student ledgers. */
export function MonthlyGenerationPage() {
  const { role } = useActor()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<GenerationStep>(1)
  const [month, setMonth] = useState(currentMonthKey)
  const [classFilter, setClassFilter] = useState(ALL)
  const [ledgerOf, setLedgerOf] = useState<number | null>(null)

  const sessions = useSessionsList()
  const current = sessions.data?.find((s) => s.current) ?? sessions.data?.[0]
  const classes = useClassesList(current ? Number(current.id) : undefined)

  const input: GenerationInput = { month, ...(classFilter !== ALL ? { classId: Number(classFilter) } : {}) }
  const preview = useMutation({ mutationFn: generationService.preview })
  const generate = useMutation({
    mutationFn: generationService.generate,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [GENERATION_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [LEDGER_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ["fee-months"] }),
      ])
      setStep(4)
      toast.success(
        result.totals.bills
          ? `${plural(result.totals.bills, "fee record")} created for ${monthTitle(result.month)}`
          : `Nothing new to create for ${monthTitle(result.month)}`,
      )
    },
  })

  const label = monthTitle(month)
  const classLabel = classFilter === ALL ? "All classes" : (classes.data?.find((c) => c.id === classFilter)?.label ?? "")

  function runPreview() {
    generate.reset()
    preview.mutate(input, { onSuccess: () => setStep(2) })
  }

  function restart() {
    preview.reset()
    generate.reset()
    setStep(1)
  }

  if (ledgerOf) {
    return <StudentLedgerView studentId={ledgerOf} onBack={() => setLedgerOf(null)} backLabel="Back to Generation" />
  }

  const sample = (generate.data ?? preview.data)?.classes.find((c) => c.sampleStudentId)?.sampleStudentId ?? null

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <Stepper step={step} />

      {step === 1 ? (
        <ClsPanel className="p-4 sm:p-5">
          <div className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--cls-ink)]">Select month</h2>
              <p className="mt-0.5 text-sm text-[var(--cls-muted)]">
                Each student will receive one record for <span className="font-medium text-[var(--cls-ink)]">{label}</span>
                , plus any separately billed fees due that month.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="gen-month" className="text-xs font-medium text-[var(--cls-muted)]">
                  Month
                </Label>
                <MonthPicker id="gen-month" value={month} onChange={setMonth} monthsBack={12} monthsAhead={3} className="w-full bg-white sm:w-48" />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="gen-class" className="text-xs font-medium text-[var(--cls-muted)]">
                  Classes
                </Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger id="gen-class" className="w-full bg-white sm:w-52" aria-label="Classes">
                    <SelectValue placeholder={classes.isPending ? "Loading…" : "All classes"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All classes</SelectItem>
                    {classes.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className={cn("w-full sm:w-auto", brandButton)} onClick={runPreview} disabled={preview.isPending}>
                {preview.isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <CalendarRange data-icon="inline-start" />}
                {preview.isPending ? "Preparing preview…" : "Preview Generation"}
              </Button>
            </div>
            <RulesNote />
            {preview.isError ? <ErrorNote message={errorText(preview.error)} onRetry={runPreview} /> : null}
          </div>
        </ClsPanel>
      ) : null}

      {step === 2 && preview.data ? (
        <PreviewStep
          data={preview.data}
          classLabel={classLabel}
          onBack={() => setStep(1)}
          onConfirm={() => setStep(3)}
          onLedger={setLedgerOf}
        />
      ) : null}

      {step === 3 && preview.data ? (
        <ConfirmStep
          data={preview.data}
          classLabel={classLabel}
          saving={generate.isPending}
          error={generate.isError ? errorText(generate.error) : null}
          onBack={() => setStep(2)}
          onGenerate={() => generate.mutate(input)}
        />
      ) : null}

      {step === 4 && generate.data ? (
        <DoneStep
          data={generate.data}
          previewed={preview.data}
          sample={sample}
          onAnother={restart}
          onLedger={setLedgerOf}
          onCollect={() => role && navigate(portalPath(role, role === "accountant" ? "collect" : "collect-fee"))}
        />
      ) : null}
    </div>
  )
}

function Stepper({ step }: { step: GenerationStep }) {
  return (
    <ol className="flex min-w-0 items-center gap-1.5 sm:gap-3" aria-label="Generation steps">
      {GENERATION_STEPS.map((name, i) => {
        const n = (i + 1) as GenerationStep
        const done = n < step || step === 4
        const active = n === step && step !== 4
        return (
          <li key={name} className="flex min-w-0 items-center gap-1.5 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap sm:px-3",
                active && "bg-[var(--cls-brand)] text-white",
                done && "bg-emerald-50 text-emerald-800",
                !active && !done && "text-[var(--cls-muted)]",
              )}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-full text-[10px] font-semibold",
                  active && "bg-white text-[var(--cls-brand)]",
                  done && "bg-emerald-600 text-white",
                  !active && !done && "bg-[var(--page-wash)] text-[var(--cls-muted)]",
                )}
              >
                {done ? <Check className="size-3" aria-hidden /> : n}
              </span>
              <span className={cn(!active && "hidden sm:inline")}>{name}</span>
            </span>
            {i < GENERATION_STEPS.length - 1 ? <span className="h-px w-3 shrink-0 bg-[var(--cls-border)] sm:w-10" aria-hidden /> : null}
          </li>
        )
      })}
    </ol>
  )
}

function RulesNote() {
  return (
    <details className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-3 py-2 text-xs text-[var(--cls-muted)]">
      <summary className="cursor-pointer font-medium text-[var(--cls-ink)]">What gets billed</summary>
      <ul className="mt-2 grid list-disc gap-1 pl-4">
        <li>Tuition: the class fee in force for each month (a student&apos;s fixed fee takes priority). Missing earlier months are filled in.</li>
        <li>Annual: once per session, in the first month generated while an Annual fee is set.</li>
        <li>Exam: in the month an Exam fee takes effect (mid-month dates bill the following month).</li>
        <li>Admission: once, in the admission month, for students admitted after the fee was set.</li>
        <li>Existing records are never changed or billed twice.</li>
      </ul>
    </details>
  )
}

function ErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {message}
      </span>
      <Button size="sm" variant="outline" className="bg-white" onClick={onRetry}>
        <RotateCcw data-icon="inline-start" /> Try again
      </Button>
    </div>
  )
}

function HiddenAmountsNote() {
  return (
    <p className="inline-flex items-start gap-1.5 text-xs text-[var(--cls-muted)]">
      <EyeOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      School-wide fee totals are visible to Super Admin only. Open a sample ledger to see a student&apos;s amounts.
    </p>
  )
}

function PreviewStep({
  data,
  classLabel,
  onBack,
  onConfirm,
  onLedger,
}: {
  data: GenerationResult
  classLabel: string
  onBack: () => void
  onConfirm: () => void
  onLedger: (id: number) => void
}) {
  const hidden = Boolean(data.amountsHidden)
  const nothing = data.totals.bills === 0
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--cls-ink)]">Preview — {monthTitle(data.month)}</h2>
          <p className="text-xs text-[var(--cls-muted)]">
            {classLabel} · dry run, nothing has been saved yet
          </p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 text-[var(--cls-muted)]" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Back
        </Button>
      </div>

      {hidden ? <HiddenAmountsNote /> : null}

      {!data.classes.length ? (
        <ClsPanel>
          <ClsEmpty title="No active students">There are no active students in {classLabel.toLowerCase()} to bill.</ClsEmpty>
        </ClsPanel>
      ) : (
        <ClsPanel>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className={clsHeadRowClass}>
                  <ClsTh>Class</ClsTh>
                  <ClsTh className="text-right">Students</ClsTh>
                  <ClsTh className="text-right">New records</ClsTh>
                  {!hidden ? <ClsTh className="text-right">Total due (PKR)</ClsTh> : null}
                  {!hidden ? <ClsTh className="text-right">Outstanding carried</ClsTh> : null}
                  <ClsTh className="text-right">
                    <span className="sr-only">Ledger</span>
                  </ClsTh>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.classes.map((c) => (
                  <TableRow key={c.classId ?? c.label} className={clsRowClass}>
                    <TableCell className="font-medium text-[var(--cls-ink)]">
                      {c.label}
                      {extrasSummary(c.byType) ? (
                        <span className="block text-[11px] font-normal text-[var(--cls-muted)]">incl. {extrasSummary(c.byType)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.students}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.bills}
                      {c.skippedStudents ? <span className="block text-[11px] text-[var(--cls-muted)]">{c.skippedStudents} already billed</span> : null}
                    </TableCell>
                    {!hidden ? <TableCell className="text-right font-semibold tabular-nums">{formatPkr(c.totalDue)}</TableCell> : null}
                    {!hidden ? (
                      <TableCell className={cn("text-right tabular-nums", c.outstandingCarried ? "text-red-600" : "text-[var(--cls-muted)]")}>
                        {c.outstandingCarried ? formatPkr(c.outstandingCarried) : "—"}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      {c.sampleStudentId ? (
                        <button type="button" className="text-xs font-medium text-[var(--cls-brand)] hover:underline" onClick={() => onLedger(c.sampleStudentId as number)}>
                          Sample Ledger
                        </button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-[var(--cls-border)] bg-[var(--page-wash)]/80 font-semibold hover:bg-[var(--page-wash)]/80">
                  <TableCell>All classes</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.students}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.bills}</TableCell>
                  {!hidden ? <TableCell className="text-right tabular-nums" data-testid="preview-total">{formatPkr(data.totals.totalDue)}</TableCell> : null}
                  {!hidden ? (
                    <TableCell className={cn("text-right tabular-nums", data.totals.outstandingCarried ? "text-red-600" : "")}>
                      {data.totals.outstandingCarried ? formatPkr(data.totals.outstandingCarried) : "—"}
                    </TableCell>
                  ) : null}
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <ul className="divide-y divide-[var(--cls-border)] sm:hidden">
            {data.classes.map((c) => (
              <li key={c.classId ?? c.label} className="grid gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium text-[var(--cls-ink)]">{c.label}</span>
                  {c.sampleStudentId ? (
                    <button type="button" className="shrink-0 text-xs font-medium text-[var(--cls-brand)]" onClick={() => onLedger(c.sampleStudentId as number)}>
                      Sample Ledger
                    </button>
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-[var(--cls-muted)]">Students</dt>
                  <dd className="text-right tabular-nums">{c.students}</dd>
                  <dt className="text-[var(--cls-muted)]">New records</dt>
                  <dd className="text-right tabular-nums">{c.bills}</dd>
                  {!hidden ? (
                    <>
                      <dt className="text-[var(--cls-muted)]">Total due</dt>
                      <dd className="text-right font-semibold tabular-nums">PKR {formatPkr(c.totalDue)}</dd>
                      <dt className="text-[var(--cls-muted)]">Outstanding carried</dt>
                      <dd className={cn("text-right tabular-nums", c.outstandingCarried ? "text-red-600" : "")}>
                        {c.outstandingCarried ? `PKR ${formatPkr(c.outstandingCarried)}` : "—"}
                      </dd>
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
            <li className="flex items-center justify-between bg-[var(--page-wash)]/80 px-4 py-3 text-sm font-semibold">
              <span>All classes · {data.totals.bills} records</span>
              {!hidden ? <span className="tabular-nums">PKR {formatPkr(data.totals.totalDue)}</span> : null}
            </li>
          </ul>
        </ClsPanel>
      )}

      {nothing && data.classes.length ? (
        <p className="inline-flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          Every student already has their records for {monthTitle(data.month)}. There is nothing new to generate.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" className="bg-white" onClick={onBack}>
          Back
        </Button>
        <Button className={brandButton} onClick={onConfirm} disabled={nothing}>
          Confirm Generation
        </Button>
      </div>
    </div>
  )
}

function ConfirmStep({
  data,
  classLabel,
  saving,
  error,
  onBack,
  onGenerate,
}: {
  data: GenerationResult
  classLabel: string
  saving: boolean
  error: string | null
  onBack: () => void
  onGenerate: () => void
}) {
  const t = data.totals
  return (
    <ClsPanel className="max-w-2xl p-4 sm:p-6">
      <div className="grid gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--cls-ink)]">Generate fee records for {monthTitle(data.month)}?</h2>
            <p className="mt-1 text-sm text-[var(--cls-muted)]">
              You are about to generate <strong className="text-[var(--cls-ink)]">{plural(t.bills, "fee record")}</strong> for{" "}
              <strong className="text-[var(--cls-ink)]">{plural(t.billedStudents, "student")}</strong> ({classLabel.toLowerCase()})
              {t.totalDue !== undefined ? (
                <>
                  {" "}totalling <strong className="text-[var(--cls-ink)]">PKR {formatPkr(t.totalDue)}</strong>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
        <p className="inline-flex items-start gap-2 rounded-lg bg-[var(--page-wash)] px-3 py-2 text-xs text-[var(--cls-muted)]">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This action cannot be undone. Existing records are skipped, so no student is billed twice{t.skippedStudents ? ` (${plural(t.skippedStudents, "student")} already billed)` : ""}.
        </p>
        {error ? <ErrorNote message={error} onRetry={onGenerate} /> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="bg-white" onClick={onBack} disabled={saving}>
            Back
          </Button>
          <Button className={brandButton} onClick={onGenerate} disabled={saving}>
            {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
            {saving ? "Generating…" : "Generate Records"}
          </Button>
        </div>
      </div>
    </ClsPanel>
  )
}

function DoneStep({
  data,
  previewed,
  sample,
  onAnother,
  onLedger,
  onCollect,
}: {
  data: GenerationResult
  previewed?: GenerationResult
  sample: number | null
  onAnother: () => void
  onLedger: (id: number) => void
  onCollect: () => void
}) {
  const t = data.totals
  // Someone else may have generated between preview and confirm; the result is the truth.
  const changed = previewed && previewed.totals.bills !== t.bills
  return (
    <ClsPanel className="max-w-2xl p-5 sm:p-8">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-[var(--cls-ink)]">
          {t.bills ? "Records generated" : "Already up to date"}
        </h2>
        <p className="max-w-md text-sm text-[var(--cls-muted)]" data-testid="generated-summary">
          {t.bills
            ? `Fee records for ${monthTitle(data.month)} have been created for ${plural(t.billedStudents, "student")} (${plural(t.bills, "record")}${t.totalDue !== undefined ? `, PKR ${formatPkr(t.totalDue)}` : ""}).`
            : `No new records were needed for ${monthTitle(data.month)}.`}
        </p>
        {changed ? (
          <p className="text-xs text-amber-800">Some records were created by another user after your preview, so the final count differs.</p>
        ) : null}
        <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" className="bg-white" onClick={onAnother}>
            Generate Another Month
          </Button>
          {sample ? (
            <Button variant="outline" className="bg-white" onClick={() => onLedger(sample)}>
              View Sample Ledger
            </Button>
          ) : null}
          <Button className={brandButton} onClick={onCollect}>
            Continue to Collection <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </ClsPanel>
  )
}
