import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type ReactNode,useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import examsService, {
  type ExamSummary,
  type MarkSheetDetail,
  type SheetRow,
} from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { Chooser } from "./exam-shared"
import { ExamStatusPill } from "./exam-status-pill"
import { classPapers } from "./exam-utils"

type DraftRow = {
  studentId: number
  name: string
  admissionNo: string
  score: string
  absent: boolean
  exempt: boolean
}

/** Rows always carry the sheet they were loaded from, so a stale draft is never saved to another sheet. */
type Draft = { sheetId: number; rows: DraftRow[] }

type RowCheck =
  | { kind: "pending" }
  | { kind: "absent" }
  | { kind: "exempt" }
  | { kind: "invalid"; message: string }
  | { kind: "pass" | "fail"; score: number }

type Props = {
  exam: ExamSummary
  classId: string
  paperId: string
  onSelect: (classId: string, paperId: string, replace?: boolean) => void
  canManage: boolean
  canEnter: boolean
}

function rowScore(row: SheetRow) {
  const raw = row.score ?? row.obtainedMarks
  if (raw == null || raw === "") return ""
  return String(raw)
}

function toDraft(sheet: MarkSheetDetail): Draft {
  return {
    sheetId: sheet.id,
    rows: sheet.rows.map((row) => ({
      studentId: row.fkStudentId,
      name: row.student
        ? `${row.student.firstName} ${row.student.lastName}`.trim()
        : `Student ${row.fkStudentId}`,
      admissionNo: row.student?.admissionNo ?? "",
      score: row.isAbsent || row.isExempt ? "" : rowScore(row),
      absent: Boolean(row.isAbsent),
      exempt: Boolean(row.isExempt),
    })),
  }
}

function checkRow(row: DraftRow, total: number, passing: number): RowCheck {
  if (row.absent) return { kind: "absent" }
  if (row.exempt) return { kind: "exempt" }
  const raw = row.score.trim()
  if (raw === "") return { kind: "pending" }
  const score = Number(raw)
  if (Number.isNaN(score)) return { kind: "invalid", message: "Enter a number" }
  if (score < 0) return { kind: "invalid", message: "Cannot be negative" }
  if (score > total) return { kind: "invalid", message: `Max is ${total}` }
  return { kind: score >= passing ? "pass" : "fail", score }
}

export function MarksEntryPanel({ exam, classId, paperId, onSelect, canManage, canEnter }: Props) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmReopen, setConfirmReopen] = useState(false)

  const classes = exam.classes
  const papers = useMemo(() => classPapers(exam, classId), [exam, classId])
  const sheet = papers.find((item) => String(item.id) === paperId)

  // Fill missing URL params with the first class / paper so refresh and deep links both land on a sheet.
  useEffect(() => {
    const nextClass = classId && classes.some((item) => String(item.id) === classId)
      ? classId
      : classes[0] ? String(classes[0].id) : ""
    const nextPapers = classPapers(exam, nextClass)
    const nextPaper = nextPapers.some((item) => String(item.id) === paperId)
      ? paperId
      : nextPapers[0] ? String(nextPapers[0].id) : ""
    if (nextClass !== classId || nextPaper !== paperId) onSelect(nextClass, nextPaper, true)
  }, [exam, classes, classId, paperId, onSelect])

  const sheetQuery = useQuery({
    queryKey: ["exam-sheet", sheet?.id],
    enabled: sheet != null,
    queryFn: () => examsService.sheet(sheet?.id ?? 0),
  })

  useEffect(() => {
    if (sheetQuery.data) setDraft(toDraft(sheetQuery.data))
  }, [sheetQuery.data])

  const rows = draft && sheet && draft.sheetId === sheet.id ? draft.rows : []
  const status = sheetQuery.data?.status ?? sheet?.status
  const editable = canEnter && status === "Draft"
  const totalMarks = Number(sheetQuery.data?.totalMarks ?? sheet?.totalMarks ?? 0)
  const passingMarks = Number(sheetQuery.data?.passingMarks ?? sheet?.passingMarks ?? 0)
  const checks = rows.map((row) => checkRow(row, totalMarks, passingMarks))
  const invalid = checks.filter((check) => check.kind === "invalid").length
  const entered = checks.filter((check) => check.kind !== "pending" && check.kind !== "invalid").length
  const passed = checks.filter((check) => check.kind === "pass").length
  const failed = checks.filter((check) => check.kind === "fail" || check.kind === "absent").length
  const progress = rows.length === 0 ? 0 : Math.round((entered / rows.length) * 100)

  async function refresh(sheetId: number) {
    await queryClient.invalidateQueries({ queryKey: ["exam-sheet", sheetId] })
    await queryClient.invalidateQueries({ queryKey: ["exams"] })
  }

  const save = useMutation({
    mutationFn: async ({ sheetId, submit }: { sheetId: number; submit: boolean }) => {
      if (!draft || draft.sheetId !== sheetId) throw new Error("This sheet is still loading.")
      if (invalid > 0) throw new Error("Fix the highlighted marks first.")
      const payload = draft.rows.map((row) => ({
        studentId: row.studentId,
        score: row.absent || row.exempt || row.score.trim() === "" ? null : Number(row.score),
        absent: row.absent,
        exempt: row.exempt,
      }))
      const saved = await examsService.saveRows(sheetId, payload)
      return submit ? examsService.submitSheet(sheetId) : saved
    },
    onSuccess: async (_data, { sheetId, submit }) => {
      toast.success(submit ? "Marks submitted" : "Draft saved")
      await refresh(sheetId)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not save marks.")
    },
  })

  const reopen = useMutation({
    mutationFn: (sheetId: number) => examsService.reopenSheet(sheetId),
    onSuccess: async (_data, sheetId) => {
      toast.success("Mark sheet reopened for editing")
      setConfirmReopen(false)
      await refresh(sheetId)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not reopen the sheet.")
    },
  })

  function updateRow(studentId: number, patch: Partial<DraftRow>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.studentId === studentId ? { ...row, ...patch } : row)),
          }
        : current
    )
  }

  const classLabel = classes.find((item) => String(item.id) === classId)?.label

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm md:grid-cols-2">
        <Chooser
          label="Class"
          value={classId}
          placeholder="Select class"
          onChange={(value) => onSelect(value, "")}
          options={classes.map((item) => ({ value: String(item.id), label: item.label }))}
        />
        <Chooser
          label="Paper"
          value={paperId}
          placeholder="Select paper"
          onChange={(value) => onSelect(classId, value)}
          options={papers.map((item) => ({
            value: String(item.id),
            label: `${item.subject} · ${item.status}`,
          }))}
        />
      </div>

      {!sheet ? (
        <EmptyCard>This class has no papers in this exam.</EmptyCard>
      ) : sheetQuery.isLoading || rows.length === 0 && sheetQuery.isFetching ? (
        <EmptyCard>Loading mark sheet…</EmptyCard>
      ) : sheetQuery.isError ? (
        <EmptyCard tone="error">
          {sheetQuery.error instanceof Error ? sheetQuery.error.message : "Could not load this mark sheet."}
        </EmptyCard>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#0F172A]">
                {classLabel} · {sheet.subject}
              </p>
              <p className="text-xs text-[#64748B]">
                Out of {totalMarks} · pass at {passingMarks}. Absent counts as a fail; exempt is left out of the result.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
              <span>{entered}/{rows.length} entered</span>
              <span className="text-[#0F766E]">{passed} pass</span>
              <span className="text-red-700">{failed} fail</span>
              <ExamStatusPill status={status ?? "Draft"} />
            </div>
          </div>
          <div className="h-1 bg-[#F8FAFC]">
            <div className="h-full bg-[#0F766E]" style={{ width: `${progress}%` }} />
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#64748B]">
              This class has no active students, so there is nobody to mark yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[#F8FAFC] text-[11px] tracking-wide text-[#64748B] uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Marks / {totalMarks}</th>
                    <th className="px-4 py-3 font-medium">Absent</th>
                    <th className="px-4 py-3 font-medium">Exempt</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const check = checks[index]
                    const errorId = `mark-error-${row.studentId}`
                    return (
                      <tr key={row.studentId} className="border-b border-[var(--cls-border)] last:border-0">
                        <td className="px-4 py-2 text-[#64748B]">{index + 1}</td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-[#0F172A]">{row.name}</div>
                          <div className="text-xs text-[#64748B]">{row.admissionNo}</div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <Input
                            className={cn(
                              "h-8 w-24",
                              check.kind === "invalid" && "border-red-500 focus-visible:ring-red-200"
                            )}
                            inputMode="decimal"
                            aria-label={`Marks for ${row.name}`}
                            aria-invalid={check.kind === "invalid"}
                            aria-describedby={check.kind === "invalid" ? errorId : undefined}
                            disabled={!editable || row.absent || row.exempt}
                            value={row.score}
                            onChange={(event) => updateRow(row.studentId, { score: event.target.value })}
                          />
                          {check.kind === "invalid" ? (
                            <p id={errorId} className="mt-1 text-xs text-red-600">
                              {check.message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <Checkbox
                            checked={row.absent}
                            disabled={!editable}
                            aria-label={`${row.name} absent`}
                            onCheckedChange={(checked) =>
                              updateRow(row.studentId, {
                                absent: checked === true,
                                exempt: checked === true ? false : row.exempt,
                                score: checked === true ? "" : row.score,
                              })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Checkbox
                            checked={row.exempt}
                            disabled={!editable}
                            aria-label={`${row.name} exempt`}
                            onCheckedChange={(checked) =>
                              updateRow(row.studentId, {
                                exempt: checked === true,
                                absent: checked === true ? false : row.absent,
                                score: checked === true ? "" : row.score,
                              })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <ResultChip check={check} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {canManage && status && status !== "Draft" ? (
                <Button variant="ghost" className="text-[#64748B]" onClick={() => setConfirmReopen(true)}>
                  Reopen sheet…
                </Button>
              ) : null}
              <p className="text-xs text-[#64748B]">
                {editable
                  ? invalid > 0
                    ? `${invalid} ${invalid === 1 ? "mark needs" : "marks need"} fixing before you can save.`
                    : "Save as draft to keep progress. Submit when every student has a mark, an absence, or an exemption."
                  : "This sheet is locked. Marks can change only after it is reopened."}
              </p>
            </div>
            {editable ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={save.isPending || invalid > 0}
                  onClick={() => save.mutate({ sheetId: sheet.id, submit: false })}
                >
                  Save draft
                </Button>
                <Button
                  disabled={save.isPending || invalid > 0}
                  onClick={() => save.mutate({ sheetId: sheet.id, submit: true })}
                >
                  Submit final
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={confirmReopen} onOpenChange={setConfirmReopen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen {sheet?.subject} for {classLabel}?</DialogTitle>
            <DialogDescription>
              The sheet goes back to Draft. Teachers can edit marks again, and the exam cannot be reviewed or
              published until it is submitted again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReopen(false)}>
              Keep locked
            </Button>
            <Button disabled={reopen.isPending || !sheet} onClick={() => sheet && reopen.mutate(sheet.id)}>
              {reopen.isPending ? "Reopening…" : "Reopen sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ResultChip({ check }: { check: RowCheck }) {
  const styles: Record<RowCheck["kind"], [string, string]> = {
    pass: ["Pass", "bg-[#F0FDFA] text-[#0F766E]"],
    fail: ["Fail", "bg-red-50 text-red-700"],
    absent: ["Absent · Fail", "bg-red-50 text-red-700"],
    exempt: ["Exempt", "bg-[#F1F5F9] text-[#64748B]"],
    pending: ["Pending", "bg-[#F8FAFC] text-[#94A3B8]"],
    invalid: ["Check mark", "bg-red-50 text-red-700"],
  }
  const [label, style] = styles[check.kind]
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", style)}>{label}</span>
}

function EmptyCard({ children, tone }: { children: ReactNode; tone?: "error" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white px-6 py-16 text-center text-sm shadow-sm",
        tone === "error" ? "border-red-200 text-red-700" : "border-dashed border-[var(--cls-border)] text-[#64748B]"
      )}
    >
      {children}
    </div>
  )
}
