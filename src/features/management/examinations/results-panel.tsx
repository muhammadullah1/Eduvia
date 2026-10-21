import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff, Info, ListOrdered, ShieldCheck } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
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

  const feeRuleLabel = FEE_RULES.find((rule) => rule.value === (data?.feeRule ?? feeRule))?.label ?? "—"
  const tieLabel = (data?.rankTie ?? rankTie) === "dense" ? "next number (1, 2, 2, 3)" : "shared rank (1, 2, 2, 4)"
  const counts = {
    pass: data?.rows.filter((row) => row.result === "Pass").length ?? 0,
    fail: data?.rows.filter((row) => row.result === "Fail" || row.result === "Absent").length ?? 0,
    hidden: data?.rows.filter((row) => row.visibility === "hidden").length ?? 0,
  }

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Results toolbar"
        className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
      >
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <ToolbarField label="Class" className="w-44">
              <Select value={classId || undefined} onValueChange={(value) => onSelect(value, "")}>
                <SelectTrigger size="sm" className="w-full data-[size=sm]:h-9"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {exam.classes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ToolbarField>
            <ToolbarField label="View" className="w-56">
              <Select
                value={paperId || ALL_PAPERS}
                onValueChange={(value) => onSelect(classId, value === ALL_PAPERS ? "" : value)}
              >
                <SelectTrigger size="sm" className="w-full data-[size=sm]:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PAPERS}>All papers (overall)</SelectItem>
                  {papers.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ToolbarField>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEditFees ? (
              <>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setTieOpen(true)}>
                  <ListOrdered />
                  Tie rule
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setFeeOpen(true)}>
                  <ShieldCheck />
                  Fee visibility
                </Button>
              </>
            ) : null}
            {canManage ? (
              <>
                <span className="mx-1 hidden h-6 w-px bg-[var(--cls-border)] sm:block" aria-hidden />
                <AdvanceButton exam={exam} onDone={refresh} />
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-[var(--cls-border)] bg-[var(--page-wash)] px-4 py-2.5 text-xs text-[var(--cls-muted)] md:flex-row md:flex-wrap md:items-center md:gap-x-5">
          <span className="inline-flex items-center gap-1.5">
            <Info className="size-3.5 shrink-0 text-[var(--primary-color)]" aria-hidden />
            Ranks are within this class; ties use a {tieLabel}.
          </span>
          {allPapers ? (
            <span>Overall pass needs every paper passed · absent counts as fail · exempt is left out.</span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0 text-[var(--primary-color)]" aria-hidden />
            Parents see results when: <span className="font-medium text-[var(--cls-ink)]">{feeRuleLabel}</span>
          </span>
        </div>
      </section>

      {!data ? (
        <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
          {resultsQuery.isLoading
            ? "Calculating results…"
            : "Choose a class to see its result sheet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-[var(--cls-ink)]">
              {data.classLabel} · {data.subject}
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <Stat label="Students" value={data.rows.length} />
              <Stat label="Pass" value={counts.pass} tone="green" />
              <Stat label="Fail" value={counts.fail} tone="red" />
              <Stat label="Hidden from parents" value={counts.hidden} />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[var(--page-wash)] text-[11px] font-semibold tracking-wide text-[var(--cls-muted)] uppercase">
                  <th className={cn(HEAD, STICKY_RANK, "z-30 bg-[var(--page-wash)] text-center")}>Rank</th>
                  <th className={cn(HEAD, STICKY_NAME, "z-30 bg-[var(--page-wash)]")}>Student</th>
                  {allPapers
                    ? resultPapers.map((item) => (
                        <th key={item.subjectId} className={cn(HEAD, "text-center")}>
                          {item.subject}
                          <span className="block text-[10px] font-normal tracking-normal normal-case">out of {item.totalMarks}</span>
                        </th>
                      ))
                    : null}
                  <th className={cn(HEAD, "text-right")}>Obtained</th>
                  <th className={cn(HEAD, "text-right")}>%</th>
                  <th className={cn(HEAD, "text-center")}>Grade</th>
                  <th className={HEAD}>Result</th>
                  <th className={HEAD}>Parent access</th>
                </tr>
              </thead>
              <tbody>
                {rankedRows.map((row) => (
                  <tr
                    key={row.studentId}
                    className="group bg-white transition-colors even:bg-[#FAFBFC] hover:bg-[#F0FDF4]"
                  >
                    <td className={cn(CELL, STICKY_RANK, "bg-inherit text-center font-semibold text-[var(--cls-ink)] tabular-nums")}>
                      {row.classRank ?? "—"}
                    </td>
                    <td className={cn(CELL, STICKY_NAME, "bg-inherit")}>
                      <div className="font-medium text-[var(--cls-ink)]">{row.name}</div>
                      <div className="text-xs text-[var(--cls-muted)]">{row.admissionNo}</div>
                    </td>
                    {allPapers
                      ? resultPapers.map((item) => {
                          const cell = row.papers.find((entry) => entry.subjectId === item.subjectId)
                          return (
                            <td key={item.subjectId} className={cn(CELL, "text-center")}>
                              <PaperCell status={cell?.status ?? "Pending"} obtained={cell?.obtained ?? null} />
                            </td>
                          )
                        })
                      : null}
                    <td className={cn(CELL, "text-right tabular-nums")}>
                      {row.obtained == null ? "—" : (
                        <>
                          <span className="font-semibold text-[var(--cls-ink)]">{row.obtained}</span>
                          <span className="text-[var(--cls-muted)]"> / {row.total}</span>
                        </>
                      )}
                    </td>
                    <td className={cn(CELL, "text-right tabular-nums")}>
                      {row.percentage == null ? "—" : `${row.percentage.toFixed(1)}%`}
                    </td>
                    <td className={cn(CELL, "text-center font-semibold text-[var(--cls-ink)]")}>{row.grade ?? "—"}</td>
                    <td className={CELL}>
                      <ResultBadge status={row.result} failed={allPapers ? row.failedPapers : 0} />
                    </td>
                    <td className={CELL}>
                      <ParentAccess
                        visibility={row.visibility}
                        onRelease={canOverride ? () => setOverrideStudent(row.studentId) : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canOverride && counts.hidden > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--cls-border)] px-5 py-3">
              <p className="text-xs text-[var(--cls-muted)]">
                {counts.hidden} result{counts.hidden === 1 ? " is" : "s are"} hidden because of unpaid fees.
              </p>
              <Button variant="outline" size="sm" disabled={bulk.isPending || !classId} onClick={() => bulk.mutate()}>
                <Eye />
                Show all hidden results
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

const HEAD = "h-11 border-b border-[var(--cls-border)] px-4 font-semibold whitespace-nowrap"
const CELL = "border-b border-[var(--cls-border)] px-4 py-3.5 align-middle"
// The first two columns stay put while wide result sheets scroll sideways.
const STICKY_RANK = "sticky left-0 w-16 min-w-16"
const STICKY_NAME = "sticky left-16 min-w-52 shadow-[inset_-1px_0_0_var(--cls-border)]"

const STATUS_STYLE: Record<PaperStatus, string> = {
  Pass: "bg-[#ECFDF3] text-[#027A48] ring-[#ABEFC6]",
  Fail: "bg-[#FEF3F2] text-[#B42318] ring-[#FECDCA]",
  Absent: "bg-[#FEF3F2] text-[#B42318] ring-[#FECDCA]",
  Exempt: "bg-[#F2F4F7] text-[#475467] ring-[#EAECF0]",
  Pending: "bg-white text-[#98A2B3] ring-[#EAECF0]",
}

function ToolbarField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-[var(--cls-muted)]">{label}</span>
      {children}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        tone === "green"
          ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#027A48]"
          : tone === "red"
            ? "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]"
            : "border-[var(--cls-border)] bg-white text-[var(--cls-muted)]"
      )}
    >
      <span className="font-semibold tabular-nums">{value}</span>
      {label}
    </span>
  )
}

function PaperCell({ status, obtained }: { status: PaperStatus; obtained: number | null }) {
  const label = status === "Absent" ? "Abs" : status === "Exempt" ? "Ex" : status === "Pending" ? "—" : obtained
  return (
    <span
      className={cn("inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-[13px] font-semibold tabular-nums ring-1 ring-inset", STATUS_STYLE[status])}
      title={status}
    >
      {label}
    </span>
  )
}

function ResultBadge({ status, failed }: { status: PaperStatus; failed: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", STATUS_STYLE[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
      {status === "Fail" && failed > 0 ? <span className="font-medium opacity-80">· {failed} paper{failed === 1 ? "" : "s"}</span> : null}
    </span>
  )
}

function ParentAccess({
  visibility,
  onRelease,
}: {
  visibility: "visible" | "hidden" | "override"
  onRelease?: () => void
}) {
  if (visibility === "visible") {
    return <span className="text-xs font-medium text-[#027A48]">Visible</span>
  }
  if (visibility === "override") {
    return <span className="text-xs font-medium text-[#B54708]">Released manually</span>
  }
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B42318]">
        <EyeOff className="size-3.5" aria-hidden />
        Hidden · fee unpaid
      </span>
      {onRelease ? (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onRelease}>
          Show anyway
        </Button>
      ) : null}
    </span>
  )
}
