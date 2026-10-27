import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useMemo, useState } from "react"

import schoolCatalogService, {
  type BlockDateRow,
} from "@/api/settings/school-catalog.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

import { BlockDateDialog } from "./block-date-dialog"
import { SettingsSearchField } from "./settings-search-field"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const PAGE_SIZE = 10

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplayDate(iso: string) {
  return parseIso(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatRange(start: string, end: string) {
  if (!end || end === start) return formatDisplayDate(start)
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`
}

function coversDay(row: BlockDateRow, iso: string) {
  return iso >= row.startDate && iso <= row.endDate
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const days = new Date(year, month + 1, 0).getDate()
  return [
    ...Array.from({ length: startPad }, () => null as number | null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
}

export function BlockDatesPanel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dateToEdit, setDateToEdit] = useState<BlockDateRow | null>(null)
  const [draftStart, setDraftStart] = useState<string | undefined>()
  const [draftEnd, setDraftEnd] = useState<string | undefined>()
  const [archiveTarget, setArchiveTarget] = useState<BlockDateRow | null>(null)

  const query = useQuery({
    queryKey: ["block-dates", search],
    queryFn: () =>
      schoolCatalogService.listBlockDates({ search: search || undefined }),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => schoolCatalogService.archiveBlockDate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["block-dates"] })
      setArchiveTarget(null)
      toast.success("Block date archived")
    },
    onError: (err) =>
      toast.error(errorMessage(err, "Could not archive block date.")),
  })

  const rows = query.data ?? []
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthCells(year, month), [year, month])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const rangeStart = rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min(rows.length, (safePage + 1) * PAGE_SIZE)

  function openCreate(iso?: string) {
    setDateToEdit(null)
    setDraftStart(iso)
    setDraftEnd(iso)
    setIsDialogOpen(true)
  }

  function openEdit(row: BlockDateRow) {
    setDateToEdit(row)
    setDraftStart(undefined)
    setDraftEnd(undefined)
    setIsDialogOpen(true)
  }

  function onDayClick(day: number) {
    const iso = toIso(year, month, day)
    setSelectedIso(iso)
    const hit = rows.find((row) => coversDay(row, iso))
    if (hit) {
      openEdit(hit)
      return
    }
    openCreate(iso)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--heading)]">
          Calendar &amp; Block Dates
        </h2>
        <Button onClick={() => openCreate()} className="shrink-0 gap-2 rounded-[10px]">
          <Plus className="size-3.5" strokeWidth={2.5} />
          Add Block Date
        </Button>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-[var(--heading)]">Calendar</h3>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              aria-label="Previous month"
              className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--cls-muted)] transition-colors hover:bg-[var(--secondary-color)] hover:text-[var(--primary-color)]"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-[8.5rem] text-center text-[15px] font-semibold text-[var(--heading)]">
              {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--cls-muted)] transition-colors hover:bg-[var(--secondary-color)] hover:text-[var(--primary-color)]"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="grid grid-cols-7 gap-1 rounded-t-xl bg-[color-mix(in_srgb,var(--primary-color)_8%,white)] px-0.5 py-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="flex h-9 items-center justify-center text-sm font-semibold text-[var(--heading)]"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day == null) {
                return (
                  <div
                    key={`pad-${index}`}
                    className="h-11 rounded-lg bg-[#F9FAFB] sm:h-[45px]"
                    aria-hidden
                  />
                )
              }
              const iso = toIso(year, month, day)
              const blocked = rows.some((row) => coversDay(row, iso))
              const selected = selectedIso === iso
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onDayClick(day)}
                  title={
                    blocked
                      ? rows.find((row) => coversDay(row, iso))?.name
                      : "Add block date"
                  }
                  className={cn(
                    "flex h-11 items-center justify-center rounded-lg text-base transition-colors sm:h-[45px]",
                    blocked
                      ? "bg-[var(--error-light)] font-medium text-[#A90523]"
                      : "bg-[#F9FAFB] text-[#374151] hover:bg-[var(--secondary-color)]",
                    selected &&
                      "ring-2 ring-[var(--primary-color)] ring-offset-1"
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <h3 className="text-[15px] font-semibold text-[var(--heading)]">
            Upcoming Block Dates
          </h3>
          <SettingsSearchField
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(0)
            }}
            placeholder="Search dates"
          />
        </div>

        {query.isError ? (
          <p className="text-sm text-destructive">Could not load block dates.</p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="h-11 bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] px-5 text-xs font-bold uppercase tracking-wide text-[var(--heading)]">
                  Event Name
                </TableHead>
                <TableHead className="h-11 bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] px-5 text-xs font-bold uppercase tracking-wide text-[var(--heading)]">
                  Date
                </TableHead>
                <TableHead className="h-11 bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] px-5 text-xs font-bold uppercase tracking-wide text-[var(--heading)]">
                  Description
                </TableHead>
                <TableHead className="h-11 bg-[color-mix(in_srgb,var(--primary-color)_6%,white)] px-5 text-xs font-bold uppercase tracking-wide text-[var(--heading)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && !query.isLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="h-28 px-5 text-center text-sm text-[var(--cls-muted)]"
                  >
                    No active block dates found. Click &ldquo;Add Block Date&rdquo; or a day on the calendar.
                  </TableCell>
                </TableRow>
              ) : null}
              {pageRows.map((row) => {
                const active =
                  selectedIso != null && coversDay(row, selectedIso)
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-[var(--cls-border)]",
                      active && "bg-[var(--secondary-color)]/60"
                    )}
                  >
                    <TableCell className="px-5 py-3.5 text-xs text-[var(--heading)]">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-xs text-[var(--heading)] whitespace-nowrap">
                      {formatRange(row.startDate, row.endDate)}
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate px-5 py-3.5 text-xs text-[var(--heading)]">
                      {row.description?.trim() || "—"}
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
                )
              })}
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
      </section>

      <BlockDateDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setDraftStart(undefined)
            setDraftEnd(undefined)
          }
        }}
        dateToEdit={dateToEdit}
        initialStartDate={draftStart}
        initialEndDate={draftEnd}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["block-dates"] })
        }}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this block date?"
        description={
          archiveTarget
            ? `Archive "${archiveTarget.name}" (${archiveTarget.startDate} – ${archiveTarget.endDate})? It will be removed from the active calendar and moved to Archives.`
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
