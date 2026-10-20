import { ArrowLeft } from "lucide-react"
import { useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { ExamSummary } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"

import { DocumentsPanel } from "./documents-panel"
import { ExamStatusPill } from "./exam-status-pill"
import { ExamTabs } from "./exam-tabs"
import { classPapers, type ExamDetailTab, examLocks, formatDate, formatTime } from "./exam-utils"
import { reviewState } from "./exam-utils"
import { MarksEntryPanel } from "./marks-entry-panel"
import { PublishPanel } from "./publish-panel"
import { ResultsPanel } from "./results-panel"


type Props = {
  exam: ExamSummary
  tab: ExamDetailTab
  base: string
  canManage: boolean
  canEnter: boolean
  canOverride: boolean
  canEditFees: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
  onRefresh: () => Promise<void>
}

function dateRange(exam: ExamSummary) {
  if (!exam.startDate) return "Dates not set"
  if (!exam.endDate || exam.endDate === exam.startDate) return formatDate(exam.startDate)
  return `${formatDate(exam.startDate)} – ${formatDate(exam.endDate)}`
}

function paperSlot(paperDate: string | null, startTime: string | null, endTime: string | null) {
  if (!paperDate) return "Not scheduled"
  const time = startTime ? ` · ${formatTime(startTime)}${endTime ? `–${formatTime(endTime)}` : ""}` : ""
  return `${formatDate(paperDate)}${time}`
}

export function ExamDetailPage(props: Props) {
  const { exam, tab, base, canManage } = props
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const classId = searchParams.get("class") ?? ""
  const paperId = searchParams.get("paper") ?? ""
  const locks = examLocks(exam)
  const review = reviewState(exam)

  const select = useCallback(
    (nextClass: string, nextPaper: string, replace?: boolean) => {
      const next = new URLSearchParams()
      if (nextClass) next.set("class", nextClass)
      if (nextPaper) next.set("paper", nextPaper)
      setSearchParams(next, { replace })
    },
    [setSearchParams]
  )

  function openTab(value: string, query?: URLSearchParams) {
    // Keep the chosen class when moving between sheet-aware tabs.
    const keep = query ?? new URLSearchParams(classId ? { class: classId } : {})
    const suffix = keep.toString()
    navigate(`${base}/${value}${suffix ? `?${suffix}` : ""}`)
  }

  function openSheet(sheetClassId: number, sheetId: number) {
    openTab("marks", new URLSearchParams({ class: String(sheetClassId), paper: String(sheetId) }))
  }

  const drafts = exam.sheets.filter((sheet) => sheet.status === "Draft").length
  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "papers", label: "Papers", count: exam.sheets.length },
    { value: "marks", label: "Marks Entry", count: drafts || undefined },
    { value: "results", label: "Results", count: exam.classes.length },
    { value: "publish", label: "Publish" },
    { value: "documents", label: "Documents" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={props.onBack}
            className="mt-1 inline-flex size-10 items-center justify-center rounded-xl border border-[var(--cls-border)] bg-white text-[#0F172A] shadow-sm hover:bg-[#F0FDFA]"
            aria-label="Back to exams"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">{exam.name}</h1>
              <ExamStatusPill status={exam.status} />
            </div>
            <p className="text-sm text-[#64748B]">
              {exam.examType} · {dateRange(exam)} · {exam.classes.length} class{exam.classes.length === 1 ? "" : "es"} ·{" "}
              {exam.sheets.length} papers
            </p>
          </div>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            {locks.canEdit ? (
              <Button variant="outline" onClick={props.onEdit}>
                Edit exam
              </Button>
            ) : null}
            {locks.canDelete ? (
              <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={props.onDelete}>
                Delete
              </Button>
            ) : null}
            {locks.canArchive ? (
              <Button variant="outline" onClick={props.onArchive}>
                Archive
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ExamTabs items={tabs} value={tab} onValueChange={(value) => openTab(value)} label="Exam sections" />

      {tab === "overview" ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Classes", value: exam.classes.length },
              { label: "Papers", value: exam.sheets.length },
              { label: "Sheets submitted", value: `${review.submitted + review.verified + review.published}/${review.total}` },
              { label: "Next step", value: review.label },
            ].map((stat) => (
              <article key={stat.label} className="rounded-2xl border border-[var(--cls-border)] bg-white px-4 py-3.5 shadow-sm">
                <p className="text-xs font-medium text-[#64748B]">{stat.label}</p>
                <p className="mt-1 text-[22px] leading-tight font-semibold text-[#0F172A]">{stat.value}</p>
              </article>
            ))}
          </div>
          <SheetTable exam={exam} onOpenSheet={openSheet} />
        </div>
      ) : tab === "papers" ? (
        <div className="flex flex-col gap-4">
          {exam.classes.map((klass) => {
            const papers = classPapers(exam, String(klass.id))
            const total = papers.reduce((sum, paper) => sum + Number(paper.totalMarks), 0)
            return (
              <article key={klass.id} className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--cls-border)] px-5 py-3">
                  <h3 className="font-semibold text-[#0F172A]">{klass.label}</h3>
                  <span className="text-sm font-medium text-[#0F766E]">Class total {total}</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[11px] tracking-wide text-[#64748B] uppercase">
                    <tr>
                      {["Subject", "Date & time", "Total", "Pass at", "Status"].map((heading) => (
                        <th key={heading} className="px-5 py-2.5 font-medium">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map((paper) => (
                      <tr key={paper.id} className="border-t border-[var(--cls-border)]">
                        <td className="px-5 py-2.5 font-medium text-[#0F172A]">{paper.subject}</td>
                        <td className="px-5 py-2.5 text-[#64748B]">{paperSlot(paper.paperDate, paper.startTime, paper.endTime)}</td>
                        <td className="px-5 py-2.5">{Number(paper.totalMarks)}</td>
                        <td className="px-5 py-2.5">{Number(paper.passingMarks)}</td>
                        <td className="px-5 py-2.5"><ExamStatusPill status={paper.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            )
          })}
        </div>
      ) : tab === "marks" ? (
        <MarksEntryPanel
          exam={exam}
          classId={classId}
          paperId={paperId}
          onSelect={select}
          canManage={canManage}
          canEnter={props.canEnter}
        />
      ) : tab === "results" ? (
        <ResultsPanel
          exam={exam}
          classId={classId}
          paperId={paperId}
          onSelect={select}
          canManage={canManage}
          canOverride={props.canOverride}
          canEditFees={props.canEditFees}
        />
      ) : tab === "publish" ? (
        <PublishPanel exam={exam} canManage={canManage} onDone={props.onRefresh} onOpenSheet={openSheet} />
      ) : (
        <DocumentsPanel exam={exam} />
      )}
    </div>
  )
}

function SheetTable({
  exam,
  onOpenSheet,
}: {
  exam: ExamSummary
  onOpenSheet: (classId: number, sheetId: number) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
      <p className="border-b border-[var(--cls-border)] px-5 py-3 text-sm font-semibold text-[#0F172A]">Mark sheets</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[11px] tracking-wide text-[#64748B] uppercase">
            <tr>
              {["Class", "Paper", "Entered", "Status", ""].map((heading) => (
                <th key={heading} className="px-5 py-2.5 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exam.classes.flatMap((klass) =>
              classPapers(exam, String(klass.id)).map((sheet) => (
                <tr key={sheet.id} className="border-t border-[var(--cls-border)]">
                  <td className="px-5 py-2.5">{klass.label}</td>
                  <td className="px-5 py-2.5 font-medium text-[#0F172A]">{sheet.subject}</td>
                  <td className="px-5 py-2.5 text-[#64748B]">{sheet.entered}/{sheet.students}</td>
                  <td className="px-5 py-2.5"><ExamStatusPill status={sheet.status} /></td>
                  <td className="px-5 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="text-[#0F766E]" onClick={() => onOpenSheet(klass.id, sheet.id)}>
                      Open sheet
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
