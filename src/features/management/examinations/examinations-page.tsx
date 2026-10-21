import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarCheck, ClipboardList, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import examsService, { type ExamSummary, type ScheduleExamBody } from "@/api/exams/exams.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
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
import { ExamDetailPage } from "./exam-detail-page"
import { ExamSetupPanel } from "./exam-setup-panel"
import { EXAM_DETAIL_TABS, type ExamDetailTab } from "./exam-utils"
import { ScheduleExamPage } from "./schedule-exam-page"

/**
 * URL shape (all under /:role/exams):
 *   ""                    exam list            (?view=daily for daily tests)
 *   "new"                 schedule an exam
 *   ":id/edit"            edit an exam
 *   ":id/:tab"            exam detail tab      (?class=&paper= pick the sheet)
 */
type ExamRoute =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "edit"; id: number }
  | { kind: "detail"; id: number; tab: ExamDetailTab | null }

function parseRoute(splat: string | undefined): ExamRoute {
  const [first, second] = (splat ?? "").split("/").filter(Boolean)
  if (!first) return { kind: "list" }
  if (first === "new") return { kind: "new" }
  const id = Number(first)
  if (!Number.isInteger(id) || id <= 0) return { kind: "list" }
  if (second === "edit") return { kind: "edit", id }
  const tab = EXAM_DETAIL_TABS.find((item) => item === second) ?? null
  return { kind: "detail", id, tab }
}

const LIST_TABS = [
  { value: "exams", label: "Exams", icon: ClipboardList },
  { value: "daily", label: "Daily tests", icon: CalendarCheck },
]

export function ExaminationsPage() {
  const actor = useActor()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const base = `/${params.role}/exams`
  const route = parseRoute(params["*"])
  const [removing, setRemoving] = useState<ExamSummary | null>(null)
  const [archiving, setArchiving] = useState<ExamSummary | null>(null)

  const sessionsQuery = useSessionsList()
  const current = sessionsQuery.data?.find((session) => session.current)
  const sessionId = current ? Number(current.id) : undefined
  const classesQuery = useClassesList(sessionId && Number.isFinite(sessionId) ? sessionId : undefined)
  const examsQuery = useQuery({
    queryKey: ["exams", "summary", sessionId],
    queryFn: () => examsService.summaries(sessionId),
  })

  const canManage = can(actor.role, "exams.manage")
  const canOverride = can(actor.role, "results.override")
  const canEditFees = can(actor.role, "settings.fees")
  const canEnter = canManage || actor.role === "teacher"

  const exams = examsQuery.data?.exams ?? []
  const sessionName = examsQuery.data?.session?.name ?? current?.name ?? ""
  const routeExam = "id" in route ? exams.find((exam) => exam.id === route.id) ?? null : null

  // "/exams/:id" has no tab yet: land on the overview without adding a history entry.
  useEffect(() => {
    if (route.kind === "detail" && route.tab === null) {
      navigate(`${base}/${route.id}/overview`, { replace: true })
    }
  }, [route, base, navigate])

  async function refreshExams() {
    await queryClient.invalidateQueries({ queryKey: ["exams"] })
  }

  const saveExam = useMutation({
    mutationFn: (body: ScheduleExamBody) =>
      route.kind === "edit" ? examsService.update(route.id, body) : examsService.create(body),
    onSuccess: async (saved) => {
      toast.success(route.kind === "edit" ? "Exam updated" : "Exam created")
      await refreshExams()
      const id = route.kind === "edit" ? route.id : (saved as { id?: number } | null)?.id
      navigate(id ? `${base}/${id}/papers` : base)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save the exam."),
  })

  const deleteExam = useMutation({
    mutationFn: (exam: ExamSummary) => examsService.remove(exam.id),
    onSuccess: async () => {
      toast.success("Exam deleted")
      setRemoving(null)
      await refreshExams()
      navigate(base)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete the exam."),
  })

  const archiveExam = useMutation({
    mutationFn: (exam: ExamSummary) => examsService.archive(exam.id),
    onSuccess: async () => {
      toast.success("Exam archived")
      setArchiving(null)
      await refreshExams()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not archive the exam."),
  })

  const loadState = examsQuery.isError ? (
    <div className="rounded-xl border border-red-200 bg-white px-6 py-8 text-sm text-red-700">
      <p>{examsQuery.error instanceof Error ? examsQuery.error.message : "Could not load examinations."}</p>
      <Button className="mt-3" variant="outline" onClick={() => void examsQuery.refetch()}>
        Try again
      </Button>
    </div>
  ) : examsQuery.isLoading ? (
    <p className="text-sm text-[var(--cls-muted)]">Loading examinations…</p>
  ) : null

  const notFound = (
    <div className="rounded-2xl border border-[var(--cls-border)] bg-white px-6 py-14 text-center shadow-sm">
      <p className="font-semibold text-[#0F172A]">This exam is not in the current session.</p>
      <Button className="mt-4" variant="outline" onClick={() => navigate(base)}>
        Back to exams
      </Button>
    </div>
  )

  const dialogs = (
    <>
      <Dialog open={removing != null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {removing?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the draft exam, its {removing?.sheets.length ?? 0} papers and any marks entered so
              far. This cannot be undone.
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
      <Dialog open={archiving != null} onOpenChange={(open) => !open && setArchiving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {archiving?.name}?</DialogTitle>
            <DialogDescription>
              Published results stay on record and on students’ DMCs. Archiving hides the exam from the active list; it
              cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiving(null)}>
              Cancel
            </Button>
            <Button disabled={archiveExam.isPending} onClick={() => archiving && archiveExam.mutate(archiving)}>
              {archiveExam.isPending ? "Archiving…" : "Archive exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (route.kind === "new" || route.kind === "edit") {
    if (route.kind === "edit" && !routeExam) return loadState ?? notFound
    return (
      <ScheduleExamPage
        sessionId={sessionId}
        sessionName={sessionName}
        classes={classesQuery.data ?? []}
        exam={routeExam}
        saving={saveExam.isPending}
        onCancel={() => navigate(-1)}
        onSubmit={(body) => saveExam.mutate(body)}
      />
    )
  }

  if (route.kind === "detail") {
    if (!routeExam) return loadState ?? notFound
    return (
      <>
        <ExamDetailPage
          exam={routeExam}
          tab={route.tab ?? "overview"}
          base={`${base}/${routeExam.id}`}
          canManage={canManage}
          canEnter={canEnter}
          canOverride={canOverride}
          canEditFees={canEditFees}
          onBack={() => navigate(base)}
          onEdit={() => navigate(`${base}/${routeExam.id}/edit`)}
          onDelete={() => setRemoving(routeExam)}
          onArchive={() => setArchiving(routeExam)}
          onRefresh={refreshExams}
        />
        {dialogs}
      </>
    )
  }

  const view = searchParams.get("view") === "daily" ? "daily" : "exams"
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">Examinations</h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            {sessionName
              ? `Schedule exams for session ${sessionName}, enter marks, and publish results.`
              : "Loading the current session…"}
          </p>
        </div>
        {canManage && view === "exams" ? (
          <Button className="shrink-0" onClick={() => navigate(`${base}/new`)}>
            <Plus data-icon="inline-start" />
            Schedule exam
          </Button>
        ) : null}
      </div>
      <ClsSubTabs
        aria-label="Examinations"
        items={LIST_TABS.map((item) => (item.value === "exams" ? { ...item, count: exams.length } : item))}
        value={view}
        onValueChange={(value) => navigate(value === "daily" ? `${base}?view=daily` : base)}
      />
      {view === "daily" ? (
        <DailyTestsPanel />
      ) : (
        loadState ?? (
          <ExamSetupPanel
            exams={exams}
            canManage={canManage}
            onSchedule={() => navigate(`${base}/new`)}
            onEdit={(exam) => navigate(`${base}/${exam.id}/edit`)}
            onDelete={setRemoving}
            onArchive={setArchiving}
            onOpen={(exam) => navigate(`${base}/${exam.id}/overview`)}
          />
        )
      )}
      {dialogs}
    </div>
  )
}
