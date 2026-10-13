import { CalendarDays, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import sessionsService from "@/api/sessions/sessions.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import type { AcademicSession } from "@/data/types"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useActor } from "@/lib/actor"
import { toast } from "@/lib/toast"

import { CreateSessionModal } from "./create-session-modal"
import { EditSessionModal } from "./edit-session-modal"
import {
  invalidateSessionsList,
  useSessionsList,
} from "./hooks/use-sessions"
import { SessionsDataTable } from "./sessions-data-table"
import { toSessionRows } from "./session-status"

export function SessionsPage() {
  const { syncPortalForRoute } = useSchool()
  const actor = useActor()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editSession, setEditSession] = useState<AcademicSession | null>(null)
  const [saving, setSaving] = useState(false)
  const [activateId, setActivateId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    void syncPortalForRoute(actor.role, "sessions")
  }, [actor.role, syncPortalForRoute])

  const {
    data: sessions = [],
    isLoading,
    isError,
    refetch,
  } = useSessionsList()

  const rows = useMemo(() => toSessionRows(sessions), [sessions])

  const needle = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return rows
    return rows.filter((row) =>
      `${row.name} ${row.start} ${row.end}`.toLowerCase().includes(needle)
    )
  }, [rows, needle])

  const activatingRow = rows.find((row) => row.id === activateId)
  const deletingRow = rows.find((row) => row.id === deleteId)

  const { paginatedItems, pagination } = useClientPagination(filtered)

  const otherNames = useMemo(
    () =>
      sessions
        .filter((s) => s.id !== editSession?.id)
        .map((s) => s.name),
    [sessions, editSession?.id]
  )

  async function afterMutation(message: string) {
    await invalidateSessionsList(queryClient)
    await syncPortalForRoute(actor.role, "sessions")
    toast.success(message)
  }

  async function handleCreate(payload: {
    name: string
    start: string
    end: string
  }) {
    setSaving(true)
    try {
      await sessionsService.create({
        name: payload.name,
        startDate: payload.start,
        endDate: payload.end,
        isCurrent: false,
      })
      await afterMutation("Session created")
      setModalOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create session."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(
    id: string,
    payload: { name: string; start: string; end: string }
  ) {
    setSaving(true)
    try {
      await sessionsService.update(Number(id), {
        name: payload.name,
        startDate: payload.start,
        endDate: payload.end,
      })
      await afterMutation("Session updated")
      setEditSession(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update session."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleActivateConfirm() {
    if (!activateId) return
    try {
      await sessionsService.activate(Number(activateId))
      await afterMutation("Session activated")
      setActivateId(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not activate session."
      )
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return
    setSaving(true)
    try {
      await sessionsService.remove(Number(deleteId))
      await afterMutation("Session deleted")
      setDeleteId(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete session."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-ink)]">
            Academic Sessions
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Only one session can be marked as Current at a time.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
          onClick={() => setModalOpen(true)}
        >
          <Plus data-icon="inline-start" />
          New session
        </Button>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--cls-muted)]">
            Could not load sessions.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !isLoading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <CalendarDays className="size-6" />
          </div>
          <p className="text-base font-medium text-[var(--cls-ink)]">
            No academic sessions yet
          </p>
          <p className="max-w-md text-sm text-[var(--cls-muted)]">
            Create your first session to organise admissions, classes, fees, and
            exams for a school year.
          </p>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={() => setModalOpen(true)}
          >
            <Plus data-icon="inline-start" />
            New session
          </Button>
        </div>
      ) : (
        <SessionsDataTable
          rows={paginatedItems}
          search={search}
          onSearchChange={setSearch}
          loading={isLoading}
          searchActive={Boolean(needle)}
          onClearSearch={() => setSearch("")}
          onActivate={setActivateId}
          onEdit={(row) => setEditSession(row)}
          onDelete={setDeleteId}
          pagination={pagination}
        />
      )}

      <CreateSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingNames={sessions.map((row) => row.name)}
        saving={saving}
        onSubmit={handleCreate}
      />

      <EditSessionModal
        open={Boolean(editSession)}
        onOpenChange={(open) => {
          if (!open) setEditSession(null)
        }}
        session={editSession}
        existingNames={otherNames}
        saving={saving}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={Boolean(activateId)}
        title="Activate session"
        description={
          activatingRow
            ? `Set "${activatingRow.name}" as the current session? New admissions, fees, and exams will be linked to it. The previous current session will be marked as past.`
            : "Set this session as current?"
        }
        confirmLabel="Activate session"
        onConfirm={() => void handleActivateConfirm()}
        onClose={() => setActivateId(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete session"
        description={
          deletingRow
            ? `Permanently delete "${deletingRow.name}"? This cannot be undone.`
            : "Delete this session?"
        }
        confirmLabel="Delete session"
        destructive
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}
