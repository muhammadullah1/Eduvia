import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import schoolCatalogService, {
  type LocationRow,
} from "@/api/settings/school-catalog.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { toast } from "@/lib/toast"

import { LocationDialog } from "./location-dialog"
import { SettingsSearchField } from "./settings-search-field"

const PAGE_SIZE = 10

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function LocationsPanel() {
  const queryClient = useQueryClient()
  const sessions = useSessionsList()
  const sessionList = sessions.data ?? []
  const current = sessionList.find((row) => row.current) ?? sessionList[0]
  const [sessionId, setSessionId] = useState("")
  const activeSession = sessionId || current?.id || ""
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [locationToEdit, setLocationToEdit] = useState<LocationRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<LocationRow | null>(null)

  const query = useQuery({
    queryKey: ["locations", activeSession, search],
    enabled: Boolean(activeSession),
    queryFn: () =>
      schoolCatalogService.listLocations({
        search: search || undefined,
        sessionId: Number(activeSession),
      }),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => schoolCatalogService.archiveLocation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] })
      setArchiveTarget(null)
      toast.success("Location archived")
    },
    onError: (err) =>
      toast.error(errorMessage(err, "Could not archive location.")),
  })

  const rows = query.data ?? []
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = useMemo(
    () => rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [rows, safePage]
  )
  const rangeStart = rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min(rows.length, (safePage + 1) * PAGE_SIZE)

  function openCreate() {
    setLocationToEdit(null)
    setIsDialogOpen(true)
  }

  function openEdit(row: LocationRow) {
    setLocationToEdit(row)
    setIsDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--heading)]">Rooms</h2>
        <Button onClick={openCreate} className="shrink-0 gap-2 rounded-[10px]">
          <Plus className="size-3.5" strokeWidth={2.5} />
          Add New Room
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-56">
          <Select value={activeSession} onValueChange={setSessionId}>
            <SelectTrigger className="h-10 rounded-xl bg-white">
              <SelectValue placeholder="Choose a session" />
            </SelectTrigger>
            <SelectContent>
              {sessionList.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name}
                  {session.current ? " · Current" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SettingsSearchField
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(0)
          }}
          placeholder="Search rooms"
          className="flex-1"
        />
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">Could not load locations.</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              {["Room Name", "Capacity", "Actions"].map((label) => (
                <TableHead
                  key={label}
                  className="h-11 bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] px-5 text-xs font-bold uppercase tracking-wide text-[var(--heading)]"
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && !query.isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={3}
                  className="h-28 px-5 text-center text-sm text-[var(--cls-muted)]"
                >
                  No active rooms in this session. Click &ldquo;Add New Room&rdquo; to create one.
                </TableCell>
              </TableRow>
            ) : null}
            {pageRows.map((row) => (
              <TableRow key={row.id} className="border-[var(--cls-border)]">
                <TableCell className="px-5 py-3.5 text-xs font-medium text-[var(--heading)]">
                  {row.name}
                </TableCell>
                <TableCell className="px-5 py-3.5 text-xs text-[var(--heading)]">
                  {row.capacity}
                </TableCell>
                <TableCell className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label={`Edit ${row.name}`}
                      onClick={() => openEdit(row)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-[var(--cls-muted)] transition-colors hover:bg-[var(--secondary-color)] hover:text-[var(--primary-color)]"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Archive ${row.name}`}
                      onClick={() => setArchiveTarget(row)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-[var(--cls-muted)] transition-colors hover:bg-[var(--error-light)] hover:text-[var(--destructive)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-[var(--cls-border)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--cls-muted)]">
            {rows.length === 0
              ? "0 of 0"
              : `${rangeStart}–${rangeEnd} of ${rows.length}`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--cls-muted)]">
              {PAGE_SIZE} rows per page
            </span>
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--cls-muted)] transition-colors hover:bg-[var(--page-wash)] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--cls-muted)] transition-colors hover:bg-[var(--page-wash)] disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <LocationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        locationToEdit={locationToEdit}
        sessions={sessionList}
        activeSessionId={activeSession}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["locations"] })
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this room?"
        description={
          archiveTarget
            ? `Archive "${archiveTarget.name}"? It will be removed from active timetables and moved to Archives.`
            : ""
        }
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          if (archiveTarget) archiveMutation.mutate(archiveTarget.id)
        }}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  )
}
