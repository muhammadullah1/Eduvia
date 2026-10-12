import { Layers, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import type { ClassSection } from "@/data/types"
import { CreateClassModal } from "@/features/management/classes/create-class-modal"
import { ClassesDataTable } from "@/features/management/classes/classes-data-table"
import { EditClassModal } from "@/features/management/classes/edit-class-modal"
import {
  invalidateClassesList,
  useClassesList,
} from "@/features/management/classes/hooks/use-classes"
import { useActor } from "@/lib/actor"
import { toast } from "@/lib/toast"

type Props = {
  globalQuery: string
}

export function ClassesPage({ globalQuery }: Props) {
  const { state, syncPortalForRoute } = useSchool()
  const actor = useActor()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editClass, setEditClass] = useState<ClassSection | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const currentSession = useMemo(
    () => state.sessions.find((session) => session.current),
    [state.sessions]
  )
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined

  useEffect(() => {
    void syncPortalForRoute(actor.role, "classes")
  }, [actor.role, syncPortalForRoute])

  const { data: classes = [], isLoading, isError, refetch } = useClassesList(
    Number.isFinite(sessionNumericId) ? sessionNumericId : undefined
  )

  const rows = useMemo(() => {
    return classes.map((klass) => {
      const studentCount = state.students.filter(
        (student) =>
          student.classId === klass.id && student.status !== "Withdrawn"
      ).length
      const subjectCount = new Set(
        state.slots
          .filter((slot) => slot.classId === klass.id)
          .map((slot) => slot.subject)
          .filter(Boolean)
      ).size
      return {
        ...klass,
        studentCount,
        subjectCount,
        status: "Active" as const,
      }
    })
  }, [classes, state.students, state.slots])

  const needle = (search || globalQuery).trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return rows
    return rows.filter((row) =>
      [row.grade, row.section, row.label, row.room]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [rows, needle])

  const sessionLabel = currentSession?.name ?? "—"
  const deletingRow = rows.find((row) => row.id === deleteId)

  async function afterMutation(message: string) {
    await invalidateClassesList(queryClient)
    await syncPortalForRoute(actor.role, "classes")
    toast.success(message)
  }

  async function handleCreate(payload: {
    grade: string
    section: string
    label: string
    room: string
    periodCount: number
    monthlyFee: number
  }) {
    if (!sessionNumericId || !Number.isFinite(sessionNumericId)) {
      toast.error("Activate an academic session before adding classes.")
      return
    }
    setSaving(true)
    try {
      await classesService.create({
        fkSessionId: sessionNumericId,
        grade: payload.grade,
        section: payload.section,
        label: payload.label,
        room: payload.room,
        periodCount: payload.periodCount,
        monthlyFee: payload.monthlyFee,
      })
      await afterMutation("Class created")
      setModalOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create class."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(payload: {
    id: string
    grade: string
    section: string
    label: string
    room: string
    periodCount: number
    monthlyFee: number
  }) {
    setSaving(true)
    try {
      await classesService.update(Number(payload.id), {
        grade: payload.grade,
        section: payload.section,
        label: payload.label,
        room: payload.room,
        periodCount: payload.periodCount,
        monthlyFee: payload.monthlyFee,
      })
      await afterMutation("Class updated")
      setEditClass(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update class."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return
    setSaving(true)
    try {
      await classesService.remove(Number(deleteId))
      await afterMutation("Class deleted")
      setDeleteId(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete class."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">
            Classes
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Session {sessionLabel} · {rows.length} class
            {rows.length === 1 ? "" : "es"}
            {rows.length > 0 &&
            rows.every((r) => r.studentCount === 0 && r.subjectCount === 0)
              ? " · counts update as students and timetables are added"
              : null}
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
          onClick={() => setModalOpen(true)}
          disabled={!currentSession}
        >
          <Plus data-icon="inline-start" />
          Add class
        </Button>
      </div>

      {!currentSession ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Activate an academic session before creating classes for this school
          year.
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--cls-muted)]">
            Could not load classes.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <Layers className="size-6" />
          </div>
          <p className="text-base font-medium text-[var(--cls-ink)]">
            No classes yet
          </p>
          <p className="max-w-sm text-sm text-[var(--cls-muted)]">
            Create your first class for the current session. Admissions and
            timetables will use these sections.
          </p>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={() => setModalOpen(true)}
            disabled={!currentSession}
          >
            <Plus data-icon="inline-start" />
            Add class
          </Button>
        </div>
      ) : (
        <ClassesDataTable
          rows={filtered}
          search={search}
          onSearchChange={setSearch}
          loading={isLoading}
          onEdit={(row) => setEditClass(row)}
          onDelete={setDeleteId}
          onExport={() => toast.message("Export will connect to the API later.")}
          onPrint={() => toast.message("Print will connect to the API later.")}
        />
      )}

      <CreateClassModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sessionLabel={sessionLabel}
        defaultMonthlyFee={state.classes[0]?.monthlyFee ?? 8500}
        saving={saving}
        onSubmit={handleCreate}
      />

      <EditClassModal
        open={Boolean(editClass)}
        onOpenChange={(open) => {
          if (!open) setEditClass(null)
        }}
        klass={editClass}
        sessionLabel={sessionLabel}
        saving={saving}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete class"
        description={
          deletingRow
            ? `Remove "${deletingRow.label}" from this session? Students already assigned may need to be moved first.`
            : "Delete this class?"
        }
        confirmLabel="Delete class"
        destructive
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
