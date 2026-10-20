import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import examsService, { type ExamSummary } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"

import { ExamStatusPill } from "./exam-status-pill"
import { reviewState } from "./exam-utils"


export function AdvanceButton({ exam, onDone }: { exam: ExamSummary; onDone: () => Promise<void> | void }) {
  const state = reviewState(exam)
  const advance = useMutation({
    mutationFn: () => examsService.advance(exam.id),
    onSuccess: async (result) => {
      toast.success(result.action === "published" ? "Results published" : "Sheets marked reviewed")
      await onDone()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not advance this exam."),
  })
  if (state.action === "done") return null
  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={advance.isPending || state.action === "blocked"} onClick={() => advance.mutate()}>
        {advance.isPending ? "Working…" : state.label}
      </Button>
      {state.action === "blocked" ? (
        <span className="max-w-64 text-right text-xs text-[#64748B]" role="status">
          {state.hint}
        </span>
      ) : null}
    </div>
  )
}

export function PublishPanel({
  exam,
  canManage,
  onDone,
  onOpenSheet,
}: {
  exam: ExamSummary
  canManage: boolean
  onDone: () => Promise<void> | void
  onOpenSheet: (classId: number, sheetId: number) => void
}) {
  const state = reviewState(exam)
  const steps = [
    { label: "Submitted", value: state.submitted + state.verified + state.published },
    { label: "Reviewed", value: state.verified + state.published },
    { label: "Published", value: state.published },
  ]
  const waiting = exam.sheets.filter((sheet) => sheet.status === "Draft")
  const classLabel = (id: number) => exam.classes.find((klass) => klass.id === id)?.label ?? `Class ${id}`

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.label} className="rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#64748B]">{step.label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#0F172A]">
              {step.value}
              <span className="text-base font-normal text-[#64748B]"> / {state.total}</span>
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-[#F1F5F9]">
              <div
                className="h-full rounded-full bg-[#0F766E]"
                style={{ width: `${state.total ? (step.value / state.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[#0F172A]">
            {state.action === "publish"
              ? "Ready to publish"
              : state.action === "review"
                ? "Ready for review"
                : state.action === "done"
                  ? "Results are published"
                  : "Waiting for mark sheets"}
          </p>
          <p className="text-sm text-[#64748B]">{state.hint}</p>
        </div>
        {canManage ? <AdvanceButton exam={exam} onDone={onDone} /> : null}
      </div>
      {waiting.length ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
          <p className="border-b border-[var(--cls-border)] px-5 py-3 text-sm font-semibold text-[#0F172A]">
            Sheets still in draft
          </p>
          <ul>
            {waiting.map((sheet) => (
              <li key={sheet.id} className="flex items-center justify-between border-b border-[var(--cls-border)] px-5 py-2.5 text-sm last:border-0">
                <span>
                  {classLabel(sheet.classId)} · {sheet.subject}
                  <span className="ml-2 text-xs text-[#64748B]">{sheet.entered}/{sheet.students} entered</span>
                </span>
                <span className="flex items-center gap-3">
                  <ExamStatusPill status={sheet.status} />
                  <Button variant="ghost" size="sm" className="text-[#0F766E]" onClick={() => onOpenSheet(sheet.classId, sheet.id)}>
                    Open sheet
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
