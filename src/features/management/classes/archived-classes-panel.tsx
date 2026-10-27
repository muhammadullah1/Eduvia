import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import classesService from "@/api/classes/classes.service"
import { classDisplayName } from "@/api/classes/map-class"
import { ConfirmDialog } from "@/components/app/kit"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { SettingsSearchField } from "@/features/settings/components/settings-search-field"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { toast } from "@/lib/toast"

import { ClassesDataTable } from "./classes-data-table"
import {
  invalidateClassesList,
  useClassesList,
} from "./hooks/use-classes"

type Props = {
  /** Compact layout for Settings → Archives (no page title). */
  embedded?: boolean
}

export function ArchivedClassesPanel({ embedded = false }: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const { data: sessions = [], isLoading: sessionsLoading } = useSessionsList()
  const currentSession = sessions.find((s) => s.current)
  const sessionNumericId = currentSession
    ? Number(currentSession.id)
    : undefined
  const sessionIdForQuery = Number.isFinite(sessionNumericId)
    ? sessionNumericId
    : undefined

  const { data: classes = [], isLoading, isError, refetch } = useClassesList(
    sessionIdForQuery,
    { archived: true }
  )

  const rows = useMemo(
    () =>
      classes.map((klass) => ({
        ...klass,
        studentCount: klass.studentCount ?? 0,
        subjectCount: klass.subjectCount ?? 0,
        status: "Archived" as const,
      })),
    [classes]
  )

  const needle = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return rows
    return rows.filter((row) =>
      [row.grade, row.section, row.label]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [rows, needle])

  const { paginatedItems, pagination } = useClientPagination(filtered)

  async function confirmRestore() {
    if (!restoreTarget) return
    const id = Number(restoreTarget.id)
    if (!Number.isFinite(id)) return
    setRestoringId(restoreTarget.id)
    try {
      await classesService.restore(id)
      await invalidateClassesList(queryClient)
      toast.success("Class restored to active list")
      setRestoreTarget(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not restore class."
      )
    } finally {
      setRestoringId(null)
    }
  }

  if (!currentSession) {
    return (
      <p className="text-sm text-[var(--cls-muted)]">
        Activate an academic session to view archived classes for that year.
      </p>
    )
  }

  return (
    <div className={embedded ? "flex flex-col gap-4" : "flex flex-col gap-6"}>
      {!embedded ? (
        <p className="text-sm text-[var(--cls-muted)]">
          Session {currentSession.name} · archived classes keep their history.
          Restoring is explicit and blocked if an active class already uses the
          same grade and section.
        </p>
      ) : null}

      {isError ? (
        <div className="rounded-lg border border-[var(--cls-border)] bg-white px-4 py-8 text-center text-sm text-[var(--cls-muted)]">
          Could not load archived classes.
          <button
            type="button"
            className="ml-2 font-medium text-[var(--cls-brand)]"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {embedded ? (
            <SettingsSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search classes"
            />
          ) : null}
          <ClassesDataTable
            rows={paginatedItems}
            search={search}
            onSearchChange={setSearch}
            loading={sessionsLoading || isLoading}
            searchActive={Boolean(needle)}
            onClearSearch={() => setSearch("")}
            archivedView
            hideSearch={embedded}
            onRestore={(id) => {
              const row = rows.find((r) => r.id === id)
              setRestoreTarget({
                id,
                name: row ? classDisplayName(row) : id,
              })
            }}
            restoringId={restoringId}
            pagination={pagination}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore class?"
        description={
          restoreTarget
            ? `Restore "${restoreTarget.name}" to the active class list for ${currentSession.name}? This will fail if another active class already uses the same grade and section.`
            : ""
        }
        confirmLabel={restoringId ? "Restoring…" : "Restore"}
        onConfirm={() => void confirmRestore()}
        onClose={() => !restoringId && setRestoreTarget(null)}
      />
    </div>
  )
}
