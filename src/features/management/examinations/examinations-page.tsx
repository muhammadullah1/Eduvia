import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import examsService, { type ExamSummary, type ScheduleExamBody } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"

import { DailyTestsPanel } from "./daily-tests-panel"
import { ExamTabs } from "./exam-tabs"
import { DocumentsPanel } from "./documents-panel"
import { ExamSetupPanel } from "./exam-setup-panel"
import { MarksEntryPanel } from "./marks-entry-panel"
import { ResultsPanel } from "./results-panel"
import { ScheduleExamPage } from "./schedule-exam-page"

const TABS = [
  { value: "setup", label: "Exam Setup" },
  { value: "marks", label: "Marks Entry" },
  { value: "results", label: "Results & Ranks" },
  { value: "documents", label: "Documents" },
  { value: "daily", label: "Daily Tests" },
]

export function ExaminationsPage() {
  const actor = useActor()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("setup")
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<ExamSummary | null>(null)
  const [removing, setRemoving] = useState<ExamSummary | null>(null)
  const [marksExamId, setMarksExamId] = useState<number | null>(null)

  const sessionsQuery = useSessionsList()
  const current = sessionsQuery.data?.find((session) => session.current)
  const sessionId = current ? Number(current.id) : undefined
  const classesQuery = useClassesList(
    sessionId && Number.isFinite(sessionId) ? sessionId : undefined
  )
  const examsQuery = useQuery({
    queryKey: ["exams", "summary", sessionId],
    queryFn: () => examsService.summaries(sessionId),
  })

  const canManage = can(actor.role, "exams.manage")
  const canOverride = can(actor.role, "results.override")
  const canEditFees = can(actor.role, "settings.fees")
  const canEnter = canManage || actor.role === "teacher"

  const saveExam = useMutation({
    mutationFn: (body: ScheduleExamBody) =>
      editing ? examsService.update(editing.id, body) : examsService.create(body),
    onSuccess: async () => {
      toast.success(editing ? "Exam updated" : "Exam created")
      setComposing(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ["exams"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not save the exam.")
    },
  })

  const deleteExam = useMutation({
    mutationFn: (exam: ExamSummary) => examsService.remove(exam.id),
    onSuccess: async () => {
      toast.success("Exam deleted")
      setRemoving(null)
      await queryClient.invalidateQueries({ queryKey: ["exams"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not delete the exam.")
    },
  })

  const exams = examsQuery.data?.exams ?? []
  const sessionName = examsQuery.data?.session?.name ?? current?.name ?? ""

  function openComposer(exam: ExamSummary | null) {
    setEditing(exam)
    setComposing(true)
  }

  if (composing) {
    return (
      <ScheduleExamPage
        sessionId={sessionId}
        sessionName={sessionName}
        classes={classesQuery.data ?? []}
        exam={editing}
        saving={saveExam.isPending}
        onCancel={() => {
          setComposing(false)
          setEditing(null)
        }}
        onSubmit={(body) => saveExam.mutate(body)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--heading)]">
            Examinations
          </h1>
          <p className="text-sm text-[var(--cls-muted)]">
            {sessionName ? `Session ${sessionName}` : "Loading the current session…"}
          </p>
        </div>
        {canManage && tab === "setup" ? (
          <Button onClick={() => openComposer(null)}>Schedule exam</Button>
        ) : null}
      </header>
      <ExamTabs items={TABS} value={tab} onValueChange={setTab} />
      {examsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-white px-6 py-8 text-sm text-red-700">
          <p>{examsQuery.error instanceof Error ? examsQuery.error.message : "Could not load examinations."}</p>
          <Button className="mt-3" variant="outline" onClick={() => void examsQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : examsQuery.isLoading ? (
        <p className="text-sm text-[var(--cls-muted)]">Loading examinations…</p>
      ) : tab === "setup" ? (
        <ExamSetupPanel
          exams={exams}
          canManage={canManage}
          onSchedule={() => openComposer(null)}
          onEdit={(exam) => openComposer(exam)}
          onDelete={setRemoving}
          onMarks={(exam) => {
            setMarksExamId(exam.id)
            setTab("marks")
          }}
        />
      ) : tab === "marks" ? (
        <MarksEntryPanel
          exams={exams}
          initialExamId={marksExamId}
          canManage={canManage}
          canEnter={canEnter}
        />
      ) : tab === "results" ? (
        <ResultsPanel
          exams={exams}
          canManage={canManage}
          canOverride={canOverride}
          canEditFees={canEditFees}
        />
      ) : tab === "documents" ? (
        <DocumentsPanel exams={exams} />
      ) : (
        <DailyTestsPanel />
      )}
      <Dialog open={removing != null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {removing?.name}?</DialogTitle>
            <DialogDescription>
              This removes the exam and its mark sheets. A finalised or published exam stays on record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep exam
            </Button>
            <Button
              variant="destructive"
              disabled={deleteExam.isPending}
              onClick={() => removing && deleteExam.mutate(removing)}
            >
              {deleteExam.isPending ? "Deleting…" : "Delete exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
