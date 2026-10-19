import { BookOpen, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { SubjectRow } from "@/api/subjects/map-subject"
import subjectsService from "@/api/subjects/subjects.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { useSchoolTimetableQuery } from "@/features/management/classes/hooks/use-class-detail-queries"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { toast } from "@/lib/toast"

import { toSubjectTableRows } from "./build-subject-rows"
import { CreateSubjectModal } from "./create-subject-modal"
import { EditSubjectModal } from "./edit-subject-modal"
import {
  invalidateSubjectsList,
  useSubjectsList,
} from "./hooks/use-subjects"
import type { SubjectTableRow } from "./subjects-data-table"
import { SubjectsDataTable } from "./subjects-data-table"

type Props = {
  globalQuery: string
}

export function SubjectsPage({ globalQuery }: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editSubject, setEditSubject] = useState<SubjectRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteRow, setDeleteRow] = useState<SubjectTableRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: subjects = [], isLoading, isError, refetch } =
    useSubjectsList()

  const { data: sessions = [] } = useSessionsList()
  const currentSession = sessions.find((s) => s.current)
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined
  const { data: allClasses = [] } = useClassesList(
    Number.isFinite(sessionNumericId) ? sessionNumericId : undefined
  )
  const { data: timetableSlots = [] } = useSchoolTimetableQuery()

  const rows = useMemo(
    () => toSubjectTableRows(subjects, timetableSlots, allClasses),
    [subjects, timetableSlots, allClasses]
  )

  function timetablePeriodCount(subjectId: string, subjectName: string) {
    const key = subjectName.toLowerCase()
    return timetableSlots.filter(
      (slot) =>
        slot.subjectId === subjectId ||
        slot.subject.toLowerCase() === key
    ).length
  }

  const activeCount = useMemo(
    () => subjects.filter((s) => s.status === "Active").length,
    [subjects]
  )

  const needle = (search || globalQuery).trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return rows
    return rows.filter((row) =>
      [row.name, row.code, row.classLabels.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [rows, needle])

  const { paginatedItems, pagination } = useClientPagination(filtered)

  const catalogCodes = useMemo(
    () => subjects.map((s) => ({ id: s.id, code: s.code })),
    [subjects]
  )

  async function afterMutation(message: string) {
    await invalidateSubjectsList(queryClient)
    toast.success(message)
  }

  async function handleCreate(payload: { name: string; code: string }) {
    setSaving(true)
    try {
      await subjectsService.create({
        name: payload.name,
        code: payload.code,
        isActive: true,
      })
      await afterMutation("Subject added")
      setModalOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add subject.")
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(payload: {
    id: string
    name: string
    code: string
  }) {
    setSaving(true)
    try {
      await subjectsService.update(Number(payload.id), {
        name: payload.name,
        code: payload.code,
      })
      await afterMutation("Subject updated")
      setEditSubject(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update subject."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(row: SubjectTableRow) {
    const nextActive = row.status !== "Active"
    const periods = timetablePeriodCount(row.id, row.name)
    if (!nextActive && periods > 0) {
      toast.error(
        `Cannot deactivate — ${periods} timetable period${periods === 1 ? "" : "s"} still use this subject (any session). Remove them first.`
      )
      return
    }
    setSaving(true)
    try {
      await subjectsService.update(Number(row.id), {
        isActive: nextActive,
      })
      await afterMutation(nextActive ? "Subject activated" : "Subject deactivated")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update subject status."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteRow) return
    const periods = timetablePeriodCount(deleteRow.id, deleteRow.name)
    if (periods > 0) {
      toast.error(
        `Cannot delete — ${periods} timetable period${periods === 1 ? "" : "s"} still use this subject. Remove them first.`
      )
      setDeleteRow(null)
      return
    }
    setDeleting(true)
    try {
      await subjectsService.remove(Number(deleteRow.id))
      await afterMutation("Subject deleted")
      setDeleteRow(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete subject."
      )
    } finally {
      setDeleting(false)
    }
  }

  function clearSearch() {
    setSearch("")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
            Subjects
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            {activeCount} active subject{activeCount === 1 ? "" : "s"}
            {subjects.length > activeCount
              ? ` · ${subjects.length} total in catalog`
              : null}
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
          onClick={() => setModalOpen(true)}
        >
          <Plus data-icon="inline-start" />
          Add subject
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-4 py-3 text-xs text-[var(--cls-muted)]">
        Assign subjects to classes on{" "}
        <span className="font-medium text-[var(--cls-ink)]">Timetable</span>{" "}
        (Class view, <span className="font-medium">+</span> on empty cells).
        Deactivate or delete only when the subject is not on any timetable (any
        session).
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--cls-muted)]">
            Could not load subjects.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !isLoading && subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <BookOpen className="size-6" />
          </div>
          <p className="text-base font-medium text-[var(--cls-ink)]">
            No subjects yet
          </p>
          <p className="max-w-sm text-sm text-[var(--cls-muted)]">
            Add subjects for your school catalog, then assign them on the weekly
            timetable.
          </p>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={() => setModalOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Add subject
          </Button>
        </div>
      ) : (
        <SubjectsDataTable
          rows={paginatedItems}
          search={search}
          onSearchChange={setSearch}
          loading={isLoading}
          searchActive={Boolean(needle)}
          onClearSearch={clearSearch}
          onEdit={(row) => setEditSubject(row)}
          onToggleActive={(row) => void handleToggleActive(row)}
          onDelete={(row) => setDeleteRow(row)}
          pagination={pagination}
        />
      )}

      <CreateSubjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingSubjects={catalogCodes}
        saving={saving}
        onSubmit={handleCreate}
      />

      <EditSubjectModal
        open={Boolean(editSubject)}
        onOpenChange={(open) => !open && setEditSubject(null)}
        subject={editSubject}
        existingSubjects={catalogCodes}
        saving={saving}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete subject"
        description={
          deleteRow
            ? timetablePeriodCount(deleteRow.id, deleteRow.name) > 0
              ? `"${deleteRow.name}" is on class timetables and cannot be deleted.`
              : `Permanently delete "${deleteRow.name}" (${deleteRow.code})? This cannot be undone.`
            : "Delete this subject?"
        }
        confirmLabel="Delete subject"
        destructive
        confirming={deleting}
        confirmingLabel="Deleting…"
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => !deleting && setDeleteRow(null)}
      />
    </div>
  )
}
