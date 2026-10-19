import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import examsService, { type ExamSummary } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea"

const FEE_RULES = [
  { value: "all_due_paid", label: "All dues paid through the exam month" },
  { value: "exam_month_paid", label: "Exam month paid" },
  { value: "disabled", label: "Show published results regardless of fees" },
]

type Props = {
  exams: ExamSummary[]
  canManage: boolean
  canOverride: boolean
  canEditFees: boolean
}

export function ResultsPanel({ exams, canManage, canOverride, canEditFees }: Props) {
  const queryClient = useQueryClient()
  const [examId, setExamId] = useState("")
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [feeOpen, setFeeOpen] = useState(false)
  const [tieOpen, setTieOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [overrideStudent, setOverrideStudent] = useState<number | null>(null)
  const [feeRule, setFeeRule] = useState("all_due_paid")
  const [rankTie, setRankTie] = useState<"shared" | "dense">("shared")

  const exam = exams.find((item) => String(item.id) === examId)
  const subjects = (exam?.sheets ?? []).filter((sheet) => String(sheet.classId) === classId)

  useEffect(() => {
    if (!examId && exams[0]) setExamId(String(exams[0].id))
  }, [exams, examId])

  useEffect(() => {
    if (exam && !exam.classes.some((klass) => String(klass.id) === classId)) {
      setClassId(exam.classes[0] ? String(exam.classes[0].id) : "")
    }
  }, [exam, classId])

  useEffect(() => {
    if (!subjects.some((sheet) => String(sheet.subjectId) === subjectId)) {
      setSubjectId(subjects[0] ? String(subjects[0].subjectId) : "")
    }
  }, [subjects, subjectId])

  const resultsQuery = useQuery({
    queryKey: ["exam-results", examId, classId, subjectId],
    enabled: Boolean(examId && classId && subjectId),
    queryFn: () => examsService.results(Number(examId), Number(classId), Number(subjectId)),
  })

  useEffect(() => {
    if (!resultsQuery.data) return
    setFeeRule(resultsQuery.data.feeRule)
    setRankTie(resultsQuery.data.rankTie === "dense" ? "dense" : "shared")
  }, [resultsQuery.data])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["exam-results", examId, classId, subjectId] })
    await queryClient.invalidateQueries({ queryKey: ["exams"] })
  }

  const advance = useMutation({
    mutationFn: () => examsService.advance(Number(examId)),
    onSuccess: async (result) => {
      toast.success(result.action === "published" ? "Results published" : "Sheets verified")
      await refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not advance this exam."),
  })

  const saveSettings = useMutation({
    mutationFn: () => examsService.updateVisibility({ feeRule, rankTie }),
    onSuccess: async () => {
      toast.success("Result settings saved")
      setFeeOpen(false)
      setTieOpen(false)
      await refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save the setting."),
  })

  const override = useMutation({
    mutationFn: () =>
      examsService.grantOverride(Number(examId), overrideStudent!, reason.trim()),
    onSuccess: async () => {
      toast.success("Result shown to the parent")
      setOverrideStudent(null)
      setReason("")
      await refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not release this result."),
  })

  const bulk = useMutation({
    mutationFn: () =>
      examsService.bulkOverride(
        Number(examId),
        Number(classId),
        "Released for every hidden student in this class"
      ),
    onSuccess: async (result) => {
      toast.success(
        result.granted
          ? `Released ${result.granted} hidden result${result.granted === 1 ? "" : "s"}`
          : "No hidden results needed an override"
      )
      await refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not release results."),
  })

  const data = resultsQuery.data
  const allSubmitted = exam
    ? exam.sheets.length > 0 && exam.sheets.every((sheet) => sheet.status === "Submitted")
    : false
  const allVerified = exam
    ? exam.sheets.length > 0 && exam.sheets.every((sheet) => sheet.status === "Verified")
    : false

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <Chooser label="Exam" value={examId} onChange={setExamId} options={exams.map((item) => ({ value: String(item.id), label: item.name }))} />
          <Chooser label="Class" value={classId} onChange={setClassId} options={(exam?.classes ?? []).map((item) => ({ value: String(item.id), label: item.label }))} />
          <Chooser label="Subject" value={subjectId} onChange={setSubjectId} options={subjects.map((item) => ({ value: String(item.subjectId), label: item.subject }))} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTieOpen(true)} disabled={!canEditFees}>
            Tie rule
          </Button>
          <Button variant="outline" onClick={() => setFeeOpen(true)} disabled={!canEditFees}>
            Fee visibility
          </Button>
          {canManage ? (
            <Button
              disabled={advance.isPending || (!allSubmitted && !allVerified)}
              onClick={() => advance.mutate()}
            >
              {allVerified ? "Publish results" : "Mark reviewed"}
            </Button>
          ) : null}
        </div>
      </div>

      {!data ? (
        <div className="rounded-2xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)] shadow-sm">
          {resultsQuery.isLoading
            ? "Calculating results…"
            : "Choose an exam, class, and subject to see the result sheet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--cls-ink)]">
                {data.exam.name} · {data.classLabel} · {data.subject}
              </p>
              <p className="text-xs text-[var(--cls-muted)]">
                Ranks are calculated when the sheet is opened. Ties use {data.rankTie === "dense" ? "the next number" : "a shared rank"}.
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-[var(--cls-muted)]">{data.rows.length} students</span>
              <span className="font-medium text-emerald-700">
                {data.rows.filter((row) => row.result === "Pass").length} pass
              </span>
              <span className="font-medium text-red-700">
                {data.rows.filter((row) => row.visibility === "hidden").length} hidden
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[var(--page-wash)] text-[11px] tracking-wide text-[var(--cls-muted)] uppercase">
                <tr>
                  {["#", "Student", "Obtained", "Total", "%", "Grade", "Result", "Class rank", "Overall rank", "Parent"].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, index) => (
                  <tr key={row.studentId} className="border-b border-[var(--cls-border)] last:border-0">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-[var(--cls-muted)]">{row.admissionNo}</div>
                    </td>
                    <td className="px-3 py-2">{row.obtained ?? "—"}</td>
                    <td className="px-3 py-2">{row.total}</td>
                    <td className="px-3 py-2">{row.percentage ?? "—"}</td>
                    <td className="px-3 py-2">{row.grade ?? "—"}</td>
                    <td className="px-3 py-2">{row.result}</td>
                    <td className="px-3 py-2">{row.classRank ?? "—"}</td>
                    <td className="px-3 py-2">{row.overallRank ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.visibility === "visible" ? (
                        <span className="text-emerald-700">Visible</span>
                      ) : row.visibility === "override" ? (
                        <span className="text-amber-700">Manual override</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="text-red-700">Hidden — fee unpaid</span>
                          {canOverride ? (
                            <button
                              type="button"
                              className="text-xs text-[var(--cls-brand)]"
                              onClick={() => setOverrideStudent(row.studentId)}
                            >
                              Show anyway
                            </button>
                          ) : null}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canOverride ? (
            <div className="flex justify-end border-t border-[var(--cls-border)] px-4 py-3">
              <Button variant="outline" disabled={bulk.isPending || !classId} onClick={() => bulk.mutate()}>
                Show all hidden results in this class
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={tieOpen} onOpenChange={setTieOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rank tie rule</DialogTitle>
          </DialogHeader>
          <Select value={rankTie} onValueChange={(value) => setRankTie(value as "shared" | "dense")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shared">Shared rank (1, 2, 2, 4)</SelectItem>
              <SelectItem value="dense">Next number (1, 2, 2, 3)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fee visibility rule</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--cls-muted)]">
            Publishing a sheet does not show it to a parent. This rule decides visibility when the result is read.
          </p>
          <Select value={feeRule} onValueChange={setFeeRule}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FEE_RULES.map((rule) => (
                <SelectItem key={rule.value} value={rule.value}>{rule.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideStudent != null} onOpenChange={(open) => !open && setOverrideStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show this result anyway</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why should the parent see this result?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideStudent(null)}>Cancel</Button>
            <Button disabled={override.isPending || !reason.trim()} onClick={() => override.mutate()}>
              Release result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Chooser({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--cls-muted)]">
      {label}
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
