import { useQuery } from "@tanstack/react-query"
import { ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import examsService from "@/api/exams/exams.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { studentName, useSchool } from "@/data/store"
import { FEE_RULE_LABELS } from "@/features/ops/fee-rule-labels"
import { activeOverride, resultVisibility } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { classLabel, timeAgo } from "@/lib/format"

const MIN_REASON = 3

/**
 * Result visibility (SRS addendum §8, UR-07, BR-09/10): whether a parent can see a
 * published result under the fee rule, and audited per-student overrides.
 * The result itself never changes; an override needs a reason (D9).
 */
export function ResultVisibilityPanel() {
  const { state, grantResultOverride, revokeResultOverride } = useSchool()
  const actor = useActor()
  const exams = [...new Map(state.sheets.map((sheet) => [sheet.examId, sheet])).values()]
  const [picked, setPicked] = useState("")
  const examId =
    picked || (exams.find((sheet) => sheet.status === "Published")?.examId ?? exams[0]?.examId ?? "")
  const [granting, setGranting] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const rule = state.settings.resultVisibility.feeRule
  const sheets = state.sheets.filter((sheet) => sheet.examId === examId)
  const exam = sheets[0]
  const studentIds = [...new Set(sheets.flatMap((sheet) => sheet.rows.map((row) => row.studentId)))]
  const today = getToday()
  const context = { feeMonths: state.feeMonths, overrides: state.resultOverrides, rule, today }
  // Fee status comes from the API as a yes/no flag (the Operations Manager has no fee
  // months to work it out from, and must never receive amounts).
  const gateQuery = useQuery({
    queryKey: ["exam-gate", examId],
    queryFn: () => examsService.gateStatus(Number(examId)),
    enabled: /^\d+$/.test(examId),
  })
  const gate = new Map((gateQuery.data?.rows ?? []).map((row) => [String(row.student.id), row]))
  const reasonError = reason.trim().length < MIN_REASON ? `Give a reason of at least ${MIN_REASON} characters.` : null

  function close() {
    setGranting(null)
    setReason("")
    setTouched(false)
  }

  function grant() {
    setTouched(true)
    if (!granting || reasonError) return
    const message = grantResultOverride(examId, granting, reason, actor)
    if (message) toast.error(message)
    else {
      toast.success("Result released to the parent")
      close()
    }
  }

  if (!exams.length) {
    return (
      <ClsPanel>
        <ClsPanelHeader title="Result visibility" description={`Fee rule: ${FEE_RULE_LABELS[rule]}`} />
        <ClsEmpty title="No exam results yet">
          Once an exam has marks, each student appears here with whether their parent can see the result under the fee
          rule. You can release a withheld result with an audited override; marks and fees are never changed.
        </ClsEmpty>
      </ClsPanel>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ClsPanel>
        <ClsPanelHeader
          title="Result visibility"
          description={
            <>
              Fee rule: {FEE_RULE_LABELS[rule]}
              {exam?.feeMonth ? ` (${monthLabel(exam.feeMonth)})` : ""}. Checked when the parent opens results; the
              result itself never changes.
            </>
          }
          actions={
            <Select value={examId} onValueChange={setPicked}>
              <SelectTrigger size="sm" className="w-64 border-[var(--cls-border)]" aria-label="Exam">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exams.map((sheet) => (
                  <SelectItem key={sheet.examId} value={sheet.examId}>
                    {sheet.examName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        {!studentIds.length ? (
          <ClsEmpty title="No students in this exam">Pick another exam.</ClsEmpty>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh className="w-[20%]">Student</ClsTh>
                <ClsTh className="w-[14%]">Class</ClsTh>
                <ClsTh className="w-[10%]">Published</ClsTh>
                <ClsTh className="w-[10%]">Fees cleared</ClsTh>
                <ClsTh>Override</ClsTh>
                <ClsTh className="w-[12%]">Parent sees</ClsTh>
                <ClsTh className="w-[110px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentIds.map((studentId) => {
                const own = sheets.filter((sheet) => sheet.rows.some((row) => row.studentId === studentId))
                const published = own.filter((sheet) => sheet.status === "Published")
                const cleared = gate.get(studentId)?.feeCleared
                const override = activeOverride(state.resultOverrides, examId, studentId)
                const visible =
                  gate.get(studentId)?.visibleToParent ??
                  published.some((sheet) => resultVisibility(sheet, studentId, context).visible)
                return (
                  <TableRow key={studentId} className={clsRowClass}>
                    <TableCell className="truncate text-sm font-medium text-[var(--cls-ink)]">
                      {studentName(state.students, studentId)}
                    </TableCell>
                    <TableCell className="truncate text-sm text-[var(--cls-muted)]">
                      {classLabel(state.classes, own[0]?.classId ?? "")}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--cls-muted)]">
                      {published.length}/{own.length}
                    </TableCell>
                    <TableCell>
                      {cleared == null ? (
                        <StatusChip>{gateQuery.isLoading ? "Checking…" : "—"}</StatusChip>
                      ) : (
                        <StatusChip tone={cleared ? "success" : "warning"} showDot>
                          {cleared ? "Cleared" : "Not cleared"}
                        </StatusChip>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal text-[var(--cls-muted)]">
                      {override ? (
                        <span className="line-clamp-2">
                          <span className="font-medium text-[var(--cls-ink)]">{override.grantedBy}:</span>{" "}
                          {override.reason}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {!published.length ? (
                        <StatusChip>Not published</StatusChip>
                      ) : (
                        <StatusChip tone={visible ? "success" : "danger"} showDot>
                          {visible ? "Visible" : "Withheld"}
                        </StatusChip>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {override ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const message = revokeResultOverride(override.id, actor)
                            if (message) toast.error(message)
                            else toast.success("Override revoked")
                          }}
                        >
                          Revoke
                        </Button>
                      ) : !cleared ? (
                        <Button size="sm" variant="outline" onClick={() => setGranting(studentId)}>
                          Override
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </ClsPanel>

      <ClsPanel>
        <ClsPanelHeader title="Override history" description="Who released which result, when and why." />
        {state.resultOverrides.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">No overrides yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--cls-border)]">
            {state.resultOverrides.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-[var(--cls-ink)]">{studentName(state.students, row.studentId)}</span>
                  <span className="text-[var(--cls-muted)]">
                    {" "}
                    · {state.sheets.find((sheet) => sheet.examId === row.examId)?.examName} — {row.reason}
                  </span>
                </span>
                <span className="text-xs text-[var(--cls-muted)]">
                  {row.grantedBy} · {timeAgo(row.grantedAt)}
                  {row.revokedAt ? ` · revoked by ${row.revokedBy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ClsPanel>

      <Dialog open={Boolean(granting)} onOpenChange={(value) => !value && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release result for {granting ? studentName(state.students, granting) : ""}</DialogTitle>
            <DialogDescription>
              Visibility only — marks, grades and fee records are not changed. This is audited.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="override-reason" className="text-xs">
              Reason (required)
            </Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Instalment plan agreed with the principal"
              maxLength={500}
              aria-invalid={touched && Boolean(reasonError)}
            />
            {touched && reasonError ? <p className="text-xs text-red-600">{reasonError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={grant} disabled={!reason.trim()}>
              <ShieldAlert data-icon="inline-start" />
              Release result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
