import {
  ChartColumn,
  ClipboardList,
  Files,
  FileText,
  LayoutDashboard,
  PencilLine,
  Send,
} from "lucide-react"
import { useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { ExamSummary } from "@/api/exams/exams.service"
import { BackLink } from "@/components/app/back-link"
import {
  ClsEmpty,
  clsHeadRowClass,
  ClsPanel,
  ClsPanelHeader,
  clsRowClass,
  ClsStatCard,
  ClsTh,
} from "@/components/app/cls-panel"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"

import { DocumentsPanel } from "./documents/documents-panel"
import { ExamLifecycleActions } from "./exam-actions"
import { ExamPhaseTag, ExamStatusPill } from "./exam-status-pill"
import { classPapers, type ExamDetailTab, formatDate, formatTime, reviewState } from "./exam-utils"
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
  const submitted = review.submitted + review.verified + review.published
  const tabs = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "papers", label: "Papers", icon: Files, count: exam.sheets.length },
    { value: "marks", label: "Marks entry", icon: PencilLine, count: drafts || undefined },
    { value: "results", label: "Results", icon: ChartColumn },
    { value: "publish", label: "Publish", icon: Send },
    { value: "documents", label: "Documents", icon: FileText },
  ]

  return (
    <div className="flex flex-col gap-5">
      <BackLink onClick={props.onBack}>Back to exams</BackLink>

      <ClsPanel className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div
              className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--cls-brand)] text-white"
              aria-hidden
            >
              <ClipboardList className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--cls-ink)] sm:text-2xl">{exam.name}</h1>
                <ExamStatusPill status={exam.status} />
                <ExamPhaseTag phase={exam.phase} />
              </div>
              <p className="mt-1 text-sm text-[var(--cls-muted)]">
                {exam.examType} · {dateRange(exam)} · {exam.classes.length} class
                {exam.classes.length === 1 ? "" : "es"} · {exam.sheets.length} papers
              </p>
            </div>
          </div>
          {canManage ? (
            <ExamLifecycleActions
              exam={exam}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
              onArchive={props.onArchive}
            />
          ) : null}
        </div>
      </ClsPanel>

      <ClsSubTabs
        aria-label="Exam sections"
        items={tabs}
        value={tab}
        onValueChange={(value) => openTab(value)}
      />

      {tab === "overview" ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ClsStatCard label="Classes" value={exam.classes.length} hint={exam.classes.map((k) => k.label).join(", ")} />
            <ClsStatCard label="Papers" value={exam.sheets.length} hint="One per class subject" />
            <ClsStatCard
              label="Sheets submitted"
              value={`${submitted}/${review.total}`}
              hint={drafts ? `${drafts} still in draft` : "All sheets in"}
              accent={drafts ? "warning" : "success"}
            />
            <ClsStatCard label="Next step" value={review.label} hint={review.action === "blocked" ? "Waiting for sheets" : "Ready"} accent="brand" />
          </div>
          <SheetTable exam={exam} onOpenSheet={openSheet} />
        </div>
      ) : tab === "papers" ? (
        <div className="flex flex-col gap-6">
          {exam.classes.map((klass) => {
            const papers = classPapers(exam, String(klass.id))
            const total = papers.reduce((sum, paper) => sum + Number(paper.totalMarks), 0)
            return (
              <ClsPanel key={klass.id}>
                <ClsPanelHeader
                  title={klass.label}
                  description={`${papers.length} paper${papers.length === 1 ? "" : "s"}`}
                  actions={<span className="text-sm font-semibold text-[var(--cls-brand)]">Class total {total}</span>}
                />
                <Table>
                  <TableHeader>
                    <TableRow className={clsHeadRowClass}>
                      <ClsTh>Subject</ClsTh>
                      <ClsTh>Date & time</ClsTh>
                      <ClsTh>Total</ClsTh>
                      <ClsTh>Pass at</ClsTh>
                      <ClsTh>Status</ClsTh>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {papers.map((paper) => (
                      <TableRow key={paper.id} className={clsRowClass}>
                        <TableCell className="text-sm font-medium text-[var(--cls-ink)]">{paper.subject}</TableCell>
                        <TableCell className="text-sm text-[var(--cls-muted)]">
                          {paperSlot(paper.paperDate, paper.startTime, paper.endTime)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{Number(paper.totalMarks)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{Number(paper.passingMarks)}</TableCell>
                        <TableCell>
                          <ExamStatusPill status={paper.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ClsPanel>
            )
          })}
          {exam.classes.length === 0 ? (
            <ClsPanel>
              <ClsEmpty title="No papers yet">Edit the exam to add classes and their papers.</ClsEmpty>
            </ClsPanel>
          ) : null}
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
        <DocumentsPanel exam={exam} initialClassId={classId} />
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
    <ClsPanel>
      <ClsPanelHeader title="Mark sheets" description="Every class paper and how far marks entry has got." />
      <Table>
        <TableHeader>
          <TableRow className={clsHeadRowClass}>
            <ClsTh>Class</ClsTh>
            <ClsTh>Paper</ClsTh>
            <ClsTh>Entered</ClsTh>
            <ClsTh>Status</ClsTh>
            <ClsTh className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exam.classes.flatMap((klass) =>
            classPapers(exam, String(klass.id)).map((sheet) => (
              <TableRow
                key={sheet.id}
                className={`cursor-pointer ${clsRowClass}`}
                onClick={() => onOpenSheet(klass.id, sheet.id)}
              >
                <TableCell className="text-sm text-[var(--cls-ink)]">{klass.label}</TableCell>
                <TableCell className="text-sm font-medium text-[var(--cls-ink)]">{sheet.subject}</TableCell>
                <TableCell className="text-sm text-[var(--cls-muted)] tabular-nums">
                  {sheet.entered}/{sheet.students}
                </TableCell>
                <TableCell>
                  <ExamStatusPill status={sheet.status} />
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-[var(--cls-brand)]">Open sheet</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ClsPanel>
  )
}
