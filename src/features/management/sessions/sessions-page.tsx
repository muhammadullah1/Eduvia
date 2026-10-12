import { CalendarDays, Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import { useActor } from "@/lib/actor"
import { toast } from "@/lib/toast"

import { CreateSessionModal } from "./create-session-modal"
import { SessionsDataTable } from "./sessions-data-table"
import { toSessionRows } from "./session-status"

export function SessionsPage() {
  const { state, addSession, activateSession, syncPortalForRoute } = useSchool()
  const actor = useActor()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activateId, setActivateId] = useState<string | null>(null)

  useEffect(() => {
    void syncPortalForRoute(actor.role, "sessions")
  }, [actor.role, syncPortalForRoute])

  const rows = useMemo(() => toSessionRows(state.sessions), [state.sessions])

  const needle = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return rows
    return rows.filter((row) =>
      `${row.name} ${row.start} ${row.end}`.toLowerCase().includes(needle)
    )
  }, [rows, needle])

  const activating = rows.find((row) => row.id === activateId)

  async function handleCreate(payload: {
    name: string
    start: string
    end: string
  }) {
    setSaving(true)
    try {
      const result = addSession(payload, actor.name)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Session created")
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  function handleActivateConfirm() {
    if (!activateId) return
    const result = activateSession(activateId, actor.name)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Session activated")
    setActivateId(null)
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

      {filtered.length === 0 ? (
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
          rows={filtered}
          search={search}
          onSearchChange={setSearch}
          onActivate={setActivateId}
          onExport={() => toast.message("Export will connect to the API later.")}
          onPrint={() => toast.message("Print will connect to the API later.")}
        />
      )}

      <CreateSessionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingNames={rows.map((row) => row.name)}
        saving={saving}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={Boolean(activateId)}
        title="Activate session"
        description={
          activating
            ? `Set "${activating.name}" as the current session? New admissions, fees, and exams will be linked to it. The previous current session will be marked as past.`
            : "Set this session as current?"
        }
        confirmLabel="Activate session"
        onConfirm={handleActivateConfirm}
        onClose={() => setActivateId(null)}
      />
    </div>
  )
}
