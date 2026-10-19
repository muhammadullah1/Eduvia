import { ArrowLeft } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import {
  EXAM_TYPES,
  type ExamSummary,
  type ExamType,
  type ScheduleExamBody,
} from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClassSection } from "@/data/types"
import { cn } from "@/lib/utils"

type Props = {
  sessionId: number | undefined
  sessionName: string
  classes: ClassSection[]
  exam: ExamSummary | null
  saving: boolean
  onCancel: () => void
  onSubmit: (body: ScheduleExamBody) => void
}

const TYPE_COPY: Record<ExamType, string> = {
  "Mid-Term": "The main sitting for the term.",
  "Monthly Test": "A shorter check during the month.",
  "Final Term": "The end-of-session examination.",
  "Unit Test": "One unit, one sitting.",
}

const EMPTY = {
  name: "",
  examType: "Mid-Term" as ExamType,
  startDate: "",
  endDate: "",
  totalMarks: "100",
  passingMarks: "40",
  classIds: [] as number[],
}

export function ScheduleExamPage({
  sessionId,
  sessionName,
  classes,
  exam,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState("")
  const locked = exam?.status === "Published" || exam?.status === "Finalised"

  useEffect(() => {
    if (!exam) {
      setForm(EMPTY)
      return
    }
    setForm({
      name: exam.name,
      examType: (EXAM_TYPES as readonly string[]).includes(exam.examType)
        ? (exam.examType as ExamType)
        : "Mid-Term",
      startDate: exam.startDate ?? "",
      endDate: exam.endDate ?? "",
      totalMarks: String(exam.totalMarks),
      passingMarks: String(exam.passingMarks),
      classIds: exam.classes.map((klass) => klass.id),
    })
  }, [exam])

  function toggleClass(id: number) {
    setForm((current) => ({
      ...current,
      classIds: current.classIds.includes(id)
        ? current.classIds.filter((item) => item !== id)
        : [...current.classIds, id],
    }))
  }

  function submit() {
    if (!sessionId) {
      setError("The current session is still loading.")
      return
    }
    const total = Number(form.totalMarks)
    const passing = Number(form.passingMarks)
    if (!form.name.trim()) {
      setError("Give the exam a name.")
      return
    }
    if (!form.startDate || !form.endDate) {
      setError("Choose a start date and an end date.")
      return
    }
    if (form.endDate < form.startDate) {
      setError("The end date has to be on or after the start date.")
      return
    }
    if (!Number.isFinite(total) || total <= 0) {
      setError("Total marks must be greater than zero.")
      return
    }
    if (!Number.isFinite(passing) || passing < 0 || passing > total) {
      setError("Passing marks must sit between zero and the total.")
      return
    }
    if (form.classIds.length === 0) {
      setError("Choose at least one class.")
      return
    }
    setError("")
    onSubmit({
      name: form.name.trim(),
      examType: form.examType,
      sessionId,
      startDate: form.startDate,
      endDate: form.endDate,
      totalMarks: total,
      passingMarks: passing,
      classIds: form.classIds,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--cls-border)] bg-white text-[var(--cls-ink)] shadow-sm"
            aria-label="Back to examinations"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--cls-ink)]">
              {exam ? "Edit exam" : "Schedule exam"}
            </h1>
            <p className="text-sm text-[var(--cls-muted)]">
              Mark sheets are created from each class’s offered subjects.
            </p>
          </div>
        </div>
        <Button onClick={submit} disabled={saving || locked || !sessionId} className="sm:min-w-36">
          {saving ? "Saving…" : exam ? "Save exam" : "Create exam"}
        </Button>
      </div>

      <section className="rounded-2xl border border-[var(--cls-border)] bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-semibold text-[var(--cls-ink)]">Basic information</h2>
        {locked ? (
          <p className="mt-2 text-sm text-[var(--cls-muted)]">
            This exam is {exam?.status.toLowerCase()}. Dates, marks, and classes stay as they are.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EXAM_TYPES.map((type) => {
            const selected = form.examType === type
            return (
              <button
                key={type}
                type="button"
                disabled={locked}
                onClick={() => setForm((current) => ({ ...current, examType: type }))}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-[var(--cls-brand)] bg-[color-mix(in_srgb,var(--cls-brand)_8%,white)]"
                    : "border-[var(--cls-border)] bg-white hover:border-[color-mix(in_srgb,var(--cls-brand)_35%,var(--cls-border))]"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--cls-ink)]">
                  <span
                    className={cn(
                      "size-3.5 rounded-full border",
                      selected
                        ? "border-[var(--cls-brand)] bg-[var(--cls-brand)] shadow-[inset_0_0_0_3px_white]"
                        : "border-[var(--cls-border)]"
                    )}
                    aria-hidden
                  />
                  {type}
                </span>
                <span className="mt-1 block pl-5 text-xs leading-5 text-[var(--cls-muted)]">
                  {TYPE_COPY[type]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Exam name" required>
            <Input
              value={form.name}
              placeholder="e.g. Mid-Term Examination 2026"
              disabled={locked}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Session" required>
            <Input value={sessionName || "Current session"} disabled />
          </Field>
          <Field label="Date from" required>
            <DatePicker
              value={form.startDate}
              onChange={(startDate) => setForm((current) => ({ ...current, startDate }))}
              defaultMonthKind="today"
              placeholder="Select date"
              disabled={locked}
            />
          </Field>
          <Field label="Date to" required>
            <DatePicker
              value={form.endDate}
              onChange={(endDate) => setForm((current) => ({ ...current, endDate }))}
              fromDate={form.startDate || undefined}
              defaultMonthKind="today"
              placeholder="Select date"
              disabled={locked}
            />
          </Field>
          <Field label="Total marks" required>
            <Input
              inputMode="decimal"
              value={form.totalMarks}
              disabled={locked}
              onChange={(event) =>
                setForm((current) => ({ ...current, totalMarks: event.target.value }))
              }
            />
          </Field>
          <Field label="Passing marks" required>
            <Input
              inputMode="decimal"
              value={form.passingMarks}
              disabled={locked}
              onChange={(event) =>
                setForm((current) => ({ ...current, passingMarks: event.target.value }))
              }
            />
          </Field>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <Label>
              Classes <span className="text-red-600">*</span>
            </Label>
            <span className="text-xs text-[var(--cls-muted)]">
              {form.classIds.length} selected
            </span>
          </div>
          {classes.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--cls-muted)]">
              Add a class for this session before scheduling an exam.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {classes.map((klass) => {
                const id = Number(klass.id)
                const selected = form.classIds.includes(id)
                return (
                  <button
                    key={klass.id}
                    type="button"
                    disabled={locked}
                    onClick={() => toggleClass(id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-[var(--cls-brand)] bg-[color-mix(in_srgb,var(--cls-brand)_10%,white)] font-medium text-[var(--cls-brand)]"
                        : "border-[var(--cls-border)] bg-white text-[var(--cls-ink)] hover:border-[color-mix(in_srgb,var(--cls-brand)_35%,var(--cls-border))]"
                    )}
                  >
                    {classDisplayName(klass)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}
