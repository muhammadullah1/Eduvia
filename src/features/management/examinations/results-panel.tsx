import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import examsService, { type ExamSummary, type PaperStatus } from "@/api/exams/exams.service"
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
import { cn } from "@/lib/utils"

import { Chooser } from "./exam-shared"
import { classPapers } from "./exam-utils"
import { AdvanceButton } from "./publish-panel"

const FEE_RULES = [
  { value: "all_due_paid", label: "All dues paid through the exam month" },
  { value: "exam_month_paid", label: "Exam month paid" },
  { value: "disabled", label: "Show published results regardless of fees" },
]

const ALL_PAPERS = "all"

type Props = {
  exam: ExamSummary
  classId: string
  paperId: string
  onSelect: (classId: string, paperId: string, replace?: boolean) => void
  canManage: boolean
  canOverride: boolean
  canEditFees: boolean
}

export function ResultsPanel({ exam, classId, paperId, onSelect, canManage, canOverride, canEditFees }: Props) {
  const queryClient = useQueryClient()
  const [feeOpen, setFeeOpen] = useState(false)
  const [tieOpen, setTieOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [overrideStudent, setOverrideStudent] = useState<number | null>(null)
  const [feeRule, setFeeRule] = useState("all_due_paid")
  const [rankTie, setRankTie] = useState<"shared" | "dense">("shared")

  const papers = classPapers(exam, classId)
  const paper = papers.find((sheet) => String(sheet.id) === paperId)
  const subjectId = paper ? paper.subjectId : undefined

  useEffect(() => {
    if (!exam.classes.some((klass) => String(klass.id) === classId)) {
      onSelect(exam.classes[0] ? String(exam.classes[0].id) : "", "", true)
    } else if (paperId && !paper) {
      onSelect(classId, "", true)
    }
  }, [exam, classId, paperId, paper, onSelect])

  const resultsQuery = useQuery({
    queryKey: ["exam-results", exam.id, classId, subjectId ?? ALL_PAPERS],
    enabled: Boolean(classId),
    queryFn: () => examsService.results(exam.id, Number(classId), subjectId),
  })

  useEffect(() => {
    if (!resultsQuery.data) return
    setFeeRule(resultsQuery.data.feeRule)
    setRankTie(resultsQuery.data.rankTie === "dense" ? "dense" : "shared")
  }, [resultsQuery.data])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["exam-results", exam.id] })
    await queryClient.invalidateQueries({ queryKey: ["exams"] })
  }

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
    mutationFn: (studentId: number) => examsService.grantOverride(exam.id, studentId, reason.trim()),
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
        exam.id,
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
  const resultPapers = data?.papers ?? []
  const rankedRows = [...(data?.rows ?? [])].sort(
    (a, b) => (a.classRank ?? Infinity) - (b.classRank ?? Infinity) || a.name.localeCompare(b.name)
  )
  const allPapers = !subjectId

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-2">
          <Chooser
            label="Class"
            value={classId}
            placeholder="Select class"
            onChange={(value) => onSelect(value, "")}
            options={exam.classes.map((item) => ({ value: String(item.id), label: item.label }))}
          />
          <Chooser
            label="View"
            value={paperId || ALL_PAPERS}
            placeholder="All papers"
            onChange={(value) => onSelect(classId, value === ALL_PAPERS ? "" : value)}
            options={[
              { value: ALL_PAPERS, label: "All papers (overall result)" },
              ...papers.map((item) => ({ value: String(item.id), label: item.subject })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="outline" onClick={() => setTieOpen(true)} disabled={!canEditFees}>
            Tie rule
          </Button>
          <Button variant="outline" onClick={() => setFeeOpen(true)} disabled={!canEditFees}>
            Fee visibility
          </Button>
          {canManage ? <AdvanceButton exam={exam} onDone={refresh} /> : null}
        </div>
      </div>

      {!data ? (
        <div className="rounded-2xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)] shadow-sm">
          {resultsQuery.isLoading
            ? "Calculating results…"
            : "Choose a class to see its result sheet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[#0F172A]">
                {data.classLabel} · {data.subject}
              </p>
              <p className="text-xs text-[#64748B]">
                Ranks are within this class only. Ties use {data.rankTie === "dense" ? "the next number" : "a shared rank"}.
                {allPapers ? " A student passes overall only by passing every paper; absent is a fail, exempt is left out." : ""}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-[#64748B]">{data.rows.length} students</span>
              <span className="font-medium text-[#0F766E]">
                {data.rows.filter((row) => row.result === "Pass").length} pass
              </span>
              <span className="font-medium text-red-700">
                {data.rows.filter((row) => row.result === "Fail" || row.result === "Absent").length} fail
              </span>
              <span className="text-[#64748B]">
                {data.rows.filter((row) => row.visibility === "hidden").length} hidden
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#F8FAFC] text-[11px] tracking-wide text-[#64748B] uppercase">
                <tr>
                  <th className="px-3 py-3 font-medium">Rank</th>
                  <th className="px-3 py-3 font-medium">Student</th>
                  {allPapers
                    ? resultPapers.map((item) => (
                        <th key={item.subjectId} className="px-3 py-3 font-medium">
                          {item.subject}
                          <span className="block font-normal normal-case">/{item.totalMarks}</span>
                        </th>
                      ))
                    : null}
                  {["Obtained", "%", "Grade", "Result", "Parent"].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankedRows.map((row) => (
                  <tr key={row.studentId} className="border-b border-[var(--cls-border)] last:border-0">
                    <td className="px-3 py-2 font-semibold text-[#0F172A]">{row.classRank ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#0F172A]">{row.name}</div>
                      <div className="text-xs text-[#64748B]">{row.admissionNo}</div>
                    </td>
                    {allPapers
                      ? resultPapers.map((item) => {
                          const cell = row.papers.find((entry) => entry.subjectId === item.subjectId)
                          return (
                            <td key={item.subjectId} className="px-3 py-2">
                              <PaperCell status={cell?.status ?? "Pending"} obtained={cell?.obtained ?? null} />
                            </td>
                          )
                        })
                      : null}
                    <td className="px-3 py-2">{row.obtained == null ? "—" : `${row.obtained}/${row.total}`}</td>
                    <td className="px-3 py-2">{row.percentage ?? "—"}</td>
                    <td className="px-3 py-2">{row.grade ?? "—"}</td>
                    <td className="px-3 py-2">
                      <ResultBadge status={row.result} failed={allPapers ? row.failedPapers : 0} />
                    </td>
                    <td className="px-3 py-2">
                      {row.visibility === "visible" ? (
                        <span className="text-[#0F766E]">Visible</span>
                      ) : row.visibility === "override" ? (
                        <span className="text-amber-700">Manual override</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="text-red-700">Hidden — fee unpaid</span>
                          {canOverride ? (
                            <button
                              type="button"
                              className="text-xs text-[#0F766E]"
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
            <Button disabled={override.isPending || !reason.trim()} onClick={() => overrideStudent != null && override.mutate(overrideStudent)}>
              Release result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const STATUS_STYLE: Record<PaperStatus, string> = {
  Pass: "bg-[#F0FDFA] text-[#0F766E]",
  Fail: "bg-red-50 text-red-700",
  Absent: "bg-red-50 text-red-700",
  Exempt: "bg-[#F1F5F9] text-[#64748B]",
  Pending: "bg-[#F8FAFC] text-[#94A3B8]",
}

function PaperCell({ status, obtained }: { status: PaperStatus; obtained: number | null }) {
  const label = status === "Absent" ? "Abs" : status === "Exempt" ? "Ex" : status === "Pending" ? "—" : obtained
  return (
    <span className={cn("inline-flex min-w-10 justify-center rounded-md px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])} title={status}>
      {label}
    </span>
  )
}

function ResultBadge({ status, failed }: { status: PaperStatus; failed: number }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[status])}>
      {status}
      {status === "Fail" && failed > 0 ? ` · ${failed} paper${failed === 1 ? "" : "s"}` : ""}
    </span>
  )
}
