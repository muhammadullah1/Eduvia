import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ShieldAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import examsService, {
  type ExamSummary,
  type ResultOverrideDto,
} from "@/api/exams/exams.service"
import {
  ClsEmpty,
  clsHeadRowClass,
  ClsPanel,
  ClsPanelHeader,
  clsRowClass,
  ClsTh,
} from "@/components/app/cls-panel"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { FEE_RULE_LABELS } from "@/features/ops/fee-rule-labels"
import type { ResultFeeRule } from "@/data/types"
import { monthLabel } from "@/lib/fees"
import { timeAgo } from "@/lib/format"

const MIN_REASON = 3

function studentLabel(row: {
  firstName: string
  lastName: string
  admissionNo?: string | null
}) {
  return `${row.firstName} ${row.lastName}`.trim()
}

function grantedByLabel(row: ResultOverrideDto) {
  if (!row.grantedBy) return "Staff"
  return `${row.grantedBy.firstName} ${row.grantedBy.lastName}`.trim()
}

/**
 * Result visibility (SRS addendum §8): whether a parent can see a published
 * result under the fee rule, plus audited per-student overrides.
 */
export function ResultVisibilityPanel() {
  const queryClient = useQueryClient()
  const [picked, setPicked] = useState("")
  const [granting, setGranting] = useState<{
    studentId: number
    name: string
  } | null>(null)
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)

  const examsQuery = useQuery({
    queryKey: ["exams", "summaries"],
    queryFn: () => examsService.summaries(),
  })

  const exams = useMemo(() => {
    const list = examsQuery.data?.exams ?? []
    return list.filter((exam) =>
      exam.sheets.some((sheet) => sheet.status === "Published" || sheet.entered > 0)
    )
  }, [examsQuery.data])

  const examId = picked || (exams[0] ? String(exams[0].id) : "")
  const selectedExam: ExamSummary | undefined = exams.find(
    (exam) => String(exam.id) === examId
  )

  const gateQuery = useQuery({
    queryKey: ["exam-gate", examId],
    queryFn: () => examsService.gateStatus(Number(examId)),
    enabled: /^\d+$/.test(examId),
  })

  const overridesQuery = useQuery({
    queryKey: ["exam-overrides", examId],
    queryFn: () => examsService.listOverrides({ examId: Number(examId) }),
    enabled: /^\d+$/.test(examId),
  })

  const grantMutation = useMutation({
    mutationFn: () =>
      examsService.grantOverride(Number(examId), granting!.studentId, reason.trim()),
    onSuccess: async () => {
      toast.success("Result released to the parent")
      close()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exam-gate", examId] }),
        queryClient.invalidateQueries({ queryKey: ["exam-overrides", examId] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message || "Could not grant override"),
  })

  const revokeMutation = useMutation({
    mutationFn: (overrideId: number) => examsService.revokeOverride(overrideId),
    onSuccess: async () => {
      toast.success("Override revoked")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exam-gate", examId] }),
        queryClient.invalidateQueries({ queryKey: ["exam-overrides", examId] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message || "Could not revoke override"),
  })

  const feeRule = (gateQuery.data?.feeRule ?? "all_due") as ResultFeeRule
  const reasonError =
    reason.trim().length < MIN_REASON
      ? `Give a reason of at least ${MIN_REASON} characters.`
      : null

  function close() {
    setGranting(null)
    setReason("")
    setTouched(false)
  }

  function grant() {
    setTouched(true)
    if (!granting || reasonError) return
    grantMutation.mutate()
  }

  if (examsQuery.isLoading) {
    return (
      <ClsPanel>
        <ClsPanelHeader title="Result visibility" description="Loading exams…" />
        <ClsEmpty title="Loading">Fetching examination results.</ClsEmpty>
      </ClsPanel>
    )
  }

  if (!exams.length) {
    return (
      <ClsPanel>
        <ClsPanelHeader
          title="Result visibility"
          description={`Fee rule: ${FEE_RULE_LABELS[feeRule] ?? feeRule}`}
        />
        <ClsEmpty title="No exam results yet">
          Once an exam has marks, each student appears here with whether their parent
          can see the result under the fee rule. You can release a withheld result with
          an audited override; marks and fees are never changed.
        </ClsEmpty>
      </ClsPanel>
    )
  }

  const rows = gateQuery.data?.rows ?? []
  const overrides = overridesQuery.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <ClsPanel>
        <ClsPanelHeader
          title="Result visibility"
          description={
            <>
              Fee rule: {FEE_RULE_LABELS[feeRule] ?? feeRule}
              {gateQuery.data?.exam.feeMonth
                ? ` (${monthLabel(gateQuery.data.exam.feeMonth)})`
                : ""}
              . Checked when the parent opens results; the result itself never changes.
            </>
          }
          actions={
            <Select value={examId} onValueChange={setPicked}>
              <SelectTrigger
                size="sm"
                className="w-64 border-[var(--cls-border)]"
                aria-label="Exam"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={String(exam.id)}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        {gateQuery.isLoading ? (
          <ClsEmpty title="Checking fee clearance…">Loading visibility gate.</ClsEmpty>
        ) : !rows.length ? (
          <ClsEmpty title="No students in this exam">Pick another exam.</ClsEmpty>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh className="w-[22%]">Student</ClsTh>
                <ClsTh className="w-[16%]">Admission</ClsTh>
                <ClsTh className="w-[12%]">Published</ClsTh>
                <ClsTh className="w-[12%]">Fees cleared</ClsTh>
                <ClsTh>Override</ClsTh>
                <ClsTh className="w-[12%]">Parent sees</ClsTh>
                <ClsTh className="w-[110px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const name = studentLabel(row.student)
                const override = row.override
                const published =
                  (gateQuery.data?.publishedSheets ?? 0) > 0
                return (
                  <TableRow key={row.student.id} className={clsRowClass}>
                    <TableCell className="truncate text-sm font-medium text-[var(--cls-ink)]">
                      {name}
                    </TableCell>
                    <TableCell className="truncate text-sm text-[var(--cls-muted)]">
                      {row.student.admissionNo || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--cls-muted)]">
                      {gateQuery.data
                        ? `${gateQuery.data.publishedSheets}/${gateQuery.data.totalSheets}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={row.feeCleared ? "success" : "warning"} showDot>
                        {row.feeCleared ? "Cleared" : "Not cleared"}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal text-[var(--cls-muted)]">
                      {override ? (
                        <span className="line-clamp-2">{override.reason}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {!published ? (
                        <StatusChip>Not published</StatusChip>
                      ) : (
                        <StatusChip
                          tone={row.visibleToParent ? "success" : "danger"}
                          showDot
                        >
                          {row.visibleToParent ? "Visible" : "Withheld"}
                        </StatusChip>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {override ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(override.id)}
                        >
                          Revoke
                        </Button>
                      ) : !row.feeCleared ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setGranting({ studentId: row.student.id, name })
                          }
                        >
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
        <ClsPanelHeader
          title="Override history"
          description="Who released which result, when and why."
        />
        {overridesQuery.isLoading ? (
          <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">Loading…</p>
        ) : overrides.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">No overrides yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--cls-border)]">
            {overrides.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-[var(--cls-ink)]">
                    {row.student ? studentLabel(row.student) : `Student #${row.fkStudentId}`}
                  </span>
                  <span className="text-[var(--cls-muted)]">
                    {" "}
                    · {row.exam?.name ?? selectedExam?.name ?? "Exam"} — {row.reason}
                  </span>
                </span>
                <span className="text-xs text-[var(--cls-muted)]">
                  {grantedByLabel(row)} · {timeAgo(row.grantedAt)}
                  {row.revokedAt ? " · revoked" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ClsPanel>

      <Dialog open={Boolean(granting)} onOpenChange={(value) => !value && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Release result for {granting?.name ?? ""}
            </DialogTitle>
            <DialogDescription>
              Visibility only — marks, grades and fee records are not changed. This is
              audited.
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
            {touched && reasonError ? (
              <p className="text-xs text-red-600">{reasonError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={grant}
              disabled={!reason.trim() || grantMutation.isPending}
            >
              <ShieldAlert data-icon="inline-start" />
              Release result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
