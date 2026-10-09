import { ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { studentName, useSchool } from "@/data/store"
import { activeOverride, feeCleared, resultVisibility } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { classLabel, timeAgo } from "@/lib/format"

import { FEE_RULE_LABELS } from "./fee-rule-labels"

// ---- result visibility (UR-07 / §8) ---------------------------------------------------

export function ResultsGatePanel() {
  const { state, grantResultOverride, revokeResultOverride } = useSchool()
  const actor = useActor()
  const exams = [
    ...new Map(state.sheets.map((sheet) => [sheet.examId, sheet])).values(),
  ]
  const [examId, setExamId] = useState(
    exams.find((sheet) => sheet.status === "Published")?.examId ??
      exams[0]?.examId ??
      ""
  )
  const [granting, setGranting] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const rule = state.settings.resultVisibility.feeRule
  const sheets = state.sheets.filter((sheet) => sheet.examId === examId)
  const exam = sheets[0]
  const studentIds = [
    ...new Set(
      sheets.flatMap((sheet) => sheet.rows.map((row) => row.studentId))
    ),
  ]
  const today = getToday()
  const context = {
    feeMonths: state.feeMonths,
    overrides: state.resultOverrides,
    rule,
    today,
  }

  function grant() {
    if (!granting) return
    const message = grantResultOverride(examId, granting, reason, actor)
    if (message) toast.error(message)
    else {
      toast.success("Result released to the parent")
      setGranting(null)
      setReason("")
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Result visibility</CardTitle>
            <CardDescription>
              Fee rule: {FEE_RULE_LABELS[rule]}
              {exam?.feeMonth ? ` (${monthLabel(exam.feeMonth)})` : ""}. Checked
              when the parent opens results; the result itself never changes.
            </CardDescription>
          </div>
          <div className="w-72">
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {exams.map((sheet) => (
                    <SelectItem key={sheet.examId} value={sheet.examId}>
                      {sheet.examName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Published subjects</TableHead>
                <TableHead>Fee rule</TableHead>
                <TableHead>Override</TableHead>
                <TableHead>Parent sees</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentIds.map((studentId) => {
                const own = sheets.filter((sheet) =>
                  sheet.rows.some((row) => row.studentId === studentId)
                )
                const published = own.filter(
                  (sheet) => sheet.status === "Published"
                )
                const cleared = feeCleared(
                  state.feeMonths,
                  studentId,
                  exam?.feeMonth,
                  rule,
                  today
                )
                const override = activeOverride(
                  state.resultOverrides,
                  examId,
                  studentId
                )
                const visible = published.some(
                  (sheet) => resultVisibility(sheet, studentId, context).visible
                )
                return (
                  <TableRow key={studentId}>
                    <TableCell className="font-medium">
                      {studentName(state.students, studentId)}
                    </TableCell>
                    <TableCell>
                      {classLabel(state.classes, own[0]?.classId ?? "")}
                    </TableCell>
                    <TableCell>
                      {published.length}/{own.length}
                    </TableCell>
                    <TableCell>
                      {cleared ? (
                        <StatusBadge value="Paid" />
                      ) : (
                        <StatusBadge value="Unpaid" />
                      )}
                    </TableCell>
                    <TableCell>
                      {override ? (
                        <span className="text-xs">
                          <StatusBadge value="Override" />
                          <span className="block text-muted-foreground">
                            {override.grantedBy}: {override.reason}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {!published.length ? (
                        <StatusBadge value="Not published" />
                      ) : (
                        <StatusBadge value={visible ? "Visible" : "Withheld"} />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {override ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const message = revokeResultOverride(
                              override.id,
                              actor
                            )
                            if (message) toast.error(message)
                            else toast.success("Override revoked")
                          }}
                        >
                          Revoke
                        </Button>
                      ) : !cleared ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setGranting(studentId)}
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
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Override history</CardTitle>
          <CardDescription>
            Who released which result, when and why.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {state.resultOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overrides.</p>
          ) : (
            state.resultOverrides.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">
                    {studentName(state.students, row.studentId)}
                  </span>{" "}
                  ·{" "}
                  {
                    state.sheets.find((sheet) => sheet.examId === row.examId)
                      ?.examName
                  }{" "}
                  — {row.reason}
                </span>
                <span className="text-xs text-muted-foreground">
                  {row.grantedBy} · {timeAgo(row.grantedAt)}
                  {row.revokedAt ? ` · revoked by ${row.revokedBy}` : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(granting)}
        onOpenChange={(value) => !value && setGranting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Release result for{" "}
              {granting ? studentName(state.students, granting) : ""}
            </DialogTitle>
            <DialogDescription>
              Visibility only — marks, grades and fee records are not changed.
              This is audited.
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Instalment plan agreed with the principal"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGranting(null)}>
              Cancel
            </Button>
            <Button onClick={grant}>
              <ShieldAlert data-icon="inline-start" />
              Release result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
