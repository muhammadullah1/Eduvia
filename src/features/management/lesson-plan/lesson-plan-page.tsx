import { BookOpenText, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import plannedChaptersService, {
  type ChapterStatus,
  type PlannedChapterDto,
} from "@/api/lessons/planned-chapters.service"
import { classDisplayName } from "@/api/classes/map-class"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<ChapterStatus, string> = {
  Completed: "Covered",
  InProgress: "In Progress",
  Planned: "Planned",
}

function chapterNumber(row: PlannedChapterDto) {
  return Number(row.chapterNo ?? row.sequence) || 0
}

function statusTone(status: ChapterStatus) {
  if (status === "Completed") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "InProgress") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
}

export function LessonPlanPage() {
  const actor = useActor()
  const canManage = can(actor.role, "chapters.manage")
  const queryClient = useQueryClient()
  const { data: sessions = [] } = useSessionsList()
  const currentSession = sessions.find((session) => session.current)
  const sessionId = currentSession ? Number(currentSession.id) : undefined
  const { data: classes = [] } = useClassesList(
    Number.isFinite(sessionId) ? sessionId : undefined
  )
  const { data: subjects = [] } = useSubjectsList()
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [endDate, setEndDate] = useState("")
  const [editRow, setEditRow] = useState<PlannedChapterDto | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)

  const selectedClass = classId || classes[0]?.id || ""
  const selectedSubject = subjectId || (subjects[0] ? String(subjects[0].id) : "")
  const classNum = Number(selectedClass)
  const subjectNum = Number(selectedSubject)

  const query = useQuery({
    queryKey: ["planned-chapters", classNum, subjectNum],
    enabled: Number.isFinite(classNum) && classNum > 0 && Number.isFinite(subjectNum) && subjectNum > 0,
    queryFn: () =>
      plannedChaptersService.list({ classId: classNum, subjectId: subjectNum }),
  })

  const chapters = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) => chapterNumber(a) - chapterNumber(b)),
    [query.data]
  )

  const covered = chapters.filter((row) => row.status === "Completed").length
  const inProgress = chapters.filter((row) => row.status === "InProgress").length
  const planned = chapters.filter((row) => row.status === "Planned").length
  const percent = chapters.length
    ? Math.round((covered / chapters.length) * 100)
    : 0

  const klass = classes.find((row) => row.id === selectedClass)
  const subject = subjects.find((row) => String(row.id) === selectedSubject)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["planned-chapters"] })
  }

  const create = useMutation({
    mutationFn: () =>
      plannedChaptersService.create({
        fkClassId: classNum,
        fkSubjectId: subjectNum,
        title: title.trim(),
        targetDate: endDate || null,
      }),
    onSuccess: async () => {
      setTitle("")
      setEndDate("")
      setAddOpen(false)
      await refresh()
      toast.success("Chapter added")
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not add chapter."),
  })

  const saveEdit = useMutation({
    mutationFn: () => {
      if (!editRow) throw new Error("No chapter selected.")
      return plannedChaptersService.update(editRow.id, {
        title: editRow.title,
        status: editRow.status,
        targetDate: editRow.plannedEndDate ?? null,
      })
    },
    onSuccess: async () => {
      setEditRow(null)
      await refresh()
      toast.success("Chapter updated")
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not update chapter."),
  })

  const remove = useMutation({
    mutationFn: (id: number) => plannedChaptersService.remove(id),
    onSuccess: async () => {
      setDeleteId(null)
      await refresh()
      toast.success("Chapter removed")
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not remove chapter."),
  })

  async function dropOn(targetId: number) {
    if (!canManage || dragId == null || dragId === targetId) return
    const ids = chapters.map((row) => row.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDragId(null)
    try {
      await plannedChaptersService.reorder({
        classId: classNum,
        subjectId: subjectNum,
        orderedIds: next,
      })
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder chapters.")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
            Lesson Plan
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--cls-muted)]">
            Define planned chapters per class and subject. Teachers pick from
            this list when posting a daily update.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={!selectedClass || !selectedSubject}
            onClick={() => setAddOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Add Chapter
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={selectedClass} onValueChange={setClassId}>
          <SelectTrigger className="h-9 w-[160px] bg-white">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {classDisplayName(row)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSubjectId}>
          <SelectTrigger className="h-9 w-[180px] bg-white">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((row) => (
              <SelectItem key={row.id} value={String(row.id)}>
                {row.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--cls-ink)]">
              {klass ? classDisplayName(klass) : "Class"}
              {subject ? ` · ${subject.name}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[var(--cls-muted)]">
              {covered} of {chapters.length} chapters covered · {percent}%
            </p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-[var(--cls-ink)]">
            {percent}%
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--page-wash)]">
          <div
            className="h-full rounded-full bg-[var(--cls-brand)]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--cls-muted)]">
          <span>Covered: {covered}</span>
          <span>In Progress: {inProgress}</span>
          <span>Planned: {planned}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--cls-muted)]">
          Chapters — drag to reorder
        </p>
        {query.isLoading ? (
          <p className="text-sm text-[var(--cls-muted)]">Loading chapters…</p>
        ) : null}
        {query.isError ? (
          <button
            type="button"
            className="text-sm font-medium text-[var(--cls-brand)]"
            onClick={() => void query.refetch()}
          >
            Could not load chapters. Retry
          </button>
        ) : null}
        {!query.isLoading && chapters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-12 text-center">
            <BookOpenText className="mx-auto size-6 text-[var(--cls-brand)]" />
            <p className="mt-3 text-sm font-medium">No chapters planned</p>
            <p className="mt-1 text-xs text-[var(--cls-muted)]">
              Add the first chapter for this class and subject.
            </p>
          </div>
        ) : null}
        <ul className="flex flex-col gap-2">
          {chapters.map((row) => (
            <li
              key={row.id}
              draggable={canManage}
              onDragStart={() => setDragId(row.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void dropOn(row.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-3 py-3",
                dragId === row.id && "opacity-60"
              )}
            >
              <GripVertical className="size-4 shrink-0 text-[var(--cls-muted)]" />
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--page-wash)] text-xs font-semibold">
                {chapterNumber(row)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--cls-ink)]">
                  Chapter {chapterNumber(row)} — {row.title}
                </p>
                <p className="text-xs text-[var(--cls-muted)]">
                  {row.status === "Completed" && row.plannedEndDate
                    ? `Covered: ${formatDate(row.plannedEndDate)}`
                    : row.plannedEndDate
                      ? `${STATUS_LABEL[row.status]}: ${formatDate(row.plannedEndDate)}`
                      : STATUS_LABEL[row.status]}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  statusTone(row.status)
                )}
              >
                {STATUS_LABEL[row.status]}
              </span>
              {canManage ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit chapter"
                    onClick={() => setEditRow({ ...row })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove chapter"
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add chapter</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Target date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Saving…" : "Add chapter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editRow)} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit chapter</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <div className="grid gap-3">
              <div>
                <Label className="mb-1.5 block text-xs">Title</Label>
                <Input
                  value={editRow.title}
                  onChange={(e) => setEditRow({ ...editRow, title: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Status</Label>
                <Select
                  value={editRow.status}
                  onValueChange={(value) =>
                    setEditRow({ ...editRow, status: value as ChapterStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="Completed">Covered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Covered / target date</Label>
                <Input
                  type="date"
                  value={editRow.plannedEndDate?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setEditRow({ ...editRow, plannedEndDate: e.target.value || null })
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saveEdit.isPending}
              onClick={() => saveEdit.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId != null}
        title="Remove chapter?"
        description="This removes the planned chapter. Chapters already used in daily updates may be blocked by the server."
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleteId != null && remove.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
