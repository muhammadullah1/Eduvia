import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArchiveRestore, ChevronLeft, ChevronRight } from "lucide-react"
import { type ReactNode,useMemo, useState } from "react"

import schoolCatalogService from "@/api/settings/school-catalog.service"
import subjectsService from "@/api/subjects/subjects.service"
import usersService from "@/api/users/users.service"
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
import { ArchivedClassesPanel } from "@/features/management/classes/archived-classes-panel"
import { ALL_ROLES, type Role,ROLE_LABELS } from "@/lib/auth"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

import { SettingsSearchField } from "./settings-search-field"

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function roleLabel(role: string) {
  return ROLE_LABELS[role as Role] ?? role
}

type ArchiveKind = "classes" | "subjects" | "users" | "locations" | "dates"

const PAGE_SIZE = 10
const USER_ROLE_FILTERS: { value: "all" | Role; label: string }[] = [
  { value: "all", label: "All roles" },
  ...ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
]

export function ArchivesHub() {
  const [kind, setKind] = useState<ArchiveKind>("classes")
  const tabs: { id: ArchiveKind; label: string }[] = [
    { id: "classes", label: "Classes" },
    { id: "subjects", label: "Subjects" },
    { id: "users", label: "Users" },
    { id: "locations", label: "Locations" },
    { id: "dates", label: "Block dates" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--heading)]">Archives</h2>
      </div>

      <div
        role="tablist"
        aria-label="Archive categories"
        className="inline-flex w-fit max-w-full flex-wrap items-center gap-2.5 rounded-lg bg-[color-mix(in_srgb,var(--primary-color)_10%,white)] px-2 py-1.5"
      >
        {tabs.map((tab) => {
          const active = kind === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setKind(tab.id)}
              className={cn(
                "inline-flex items-center justify-center rounded-md px-4 text-sm transition-colors",
                active
                  ? "bg-white py-1.5 font-semibold text-[var(--primary-color)] shadow-sm"
                  : "py-2 font-medium text-[#303030] hover:text-[var(--primary-color)]"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {kind === "classes" ? <ArchivedClassesPanel embedded /> : null}
      {kind === "subjects" ? <ArchivedSubjects /> : null}
      {kind === "users" ? <ArchivedUsers /> : null}
      {kind === "locations" ? <ArchivedLocations /> : null}
      {kind === "dates" ? <ArchivedBlockDates /> : null}
    </div>
  )
}

function ArchivedSubjects() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const query = useQuery({
    queryKey: ["subjects", "archived"],
    queryFn: () => subjectsService.list({ archived: true }),
  })
  const restore = useMutation({
    mutationFn: (id: number) => subjectsService.restore(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["subjects"] })
      toast.success("Subject restored")
    },
    onError: (err) =>
      toast.error(errorMessage(err, "Could not restore subject.")),
  })
  const rows = useMemo(() => {
    const list = query.data ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((row) =>
      [row.name, row.code].join(" ").toLowerCase().includes(needle)
    )
  }, [query.data, search])

  return (
    <ArchiveTable
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search subjects"
      empty="No archived subjects."
      loading={query.isLoading}
      rows={rows.map((row) => ({
        id: row.id,
        title: row.name,
        category: "Subject",
        meta: row.code || "—",
      }))}
      onRestore={(id) => restore.mutate(id)}
    />
  )
}

function ArchivedUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all")
  const query = useQuery({
    queryKey: ["users", "archived"],
    queryFn: () => usersService.list({ archived: true, pageSize: 200 }),
  })
  const restore = useMutation({
    mutationFn: (id: number) => usersService.restore(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User restored")
    },
    onError: (err) =>
      toast.error(errorMessage(err, "Could not restore user.")),
  })
  const rows = useMemo(() => {
    const list = query.data?.users ?? []
    const needle = search.trim().toLowerCase()
    return list.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false
      if (!needle) return true
      return [`${row.firstName} ${row.lastName}`, row.email, row.role, roleLabel(row.role)]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
  }, [query.data, roleFilter, search])

  return (
    <ArchiveTable
      key={roleFilter}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search users"
      empty={
        roleFilter === "all"
          ? "No archived users."
          : `No archived ${ROLE_LABELS[roleFilter].toLowerCase()} users.`
      }
      loading={query.isLoading}
      filter={
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as "all" | Role)}
        >
          <SelectTrigger className="h-10 w-full rounded-xl bg-white sm:w-52" aria-label="Filter by role">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      rows={rows.map((row) => ({
        id: row.id,
        title: `${row.firstName} ${row.lastName}`,
        category: roleLabel(row.role),
        meta: row.email,
      }))}
      onRestore={(id) => restore.mutate(id)}
    />
  )
}

function ArchivedLocations() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const query = useQuery({
    queryKey: ["locations", "archived"],
    queryFn: () => schoolCatalogService.listLocations({ archived: true }),
  })
  const rows = useMemo(() => {
    const list = query.data ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((row) =>
      [row.name, row.locationCode, row.locationType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [query.data, search])

  return (
    <ArchiveTable
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search rooms"
      empty="No archived rooms."
      loading={query.isLoading}
      rows={rows.map((row) => ({
        id: row.id,
        title: row.name,
        category: "Location",
        meta: row.locationCode || row.locationType || "Location",
      }))}
      onRestore={(id) => {
        void schoolCatalogService
          .restoreLocation(id)
          .then(async () => {
            await queryClient.invalidateQueries({ queryKey: ["locations"] })
            toast.success("Room restored")
          })
          .catch((err) =>
            toast.error(errorMessage(err, "Could not restore."))
          )
      }}
    />
  )
}

function ArchivedBlockDates() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const query = useQuery({
    queryKey: ["block-dates", "archived"],
    queryFn: () => schoolCatalogService.listBlockDates({ archived: true }),
  })
  const rows = useMemo(() => {
    const list = query.data ?? []
    const needle = search.trim().toLowerCase()
    if (!needle) return list
    return list.filter((row) =>
      [row.name, row.startDate, row.endDate, row.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [query.data, search])

  return (
    <ArchiveTable
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search dates"
      empty="No archived block dates."
      loading={query.isLoading}
      rows={rows.map((row) => ({
        id: row.id,
        title: row.name,
        category: "Block date",
        meta: `${row.startDate} – ${row.endDate}`,
      }))}
      onRestore={(id) => {
        void schoolCatalogService
          .restoreBlockDate(id)
          .then(async () => {
            await queryClient.invalidateQueries({ queryKey: ["block-dates"] })
            toast.success("Block date restored")
          })
          .catch((err) =>
            toast.error(errorMessage(err, "Could not restore."))
          )
      }}
    />
  )
}

function ArchiveTable({
  rows,
  empty,
  loading,
  search,
  onSearchChange,
  searchPlaceholder,
  filter,
  onRestore,
}: {
  rows: { id: number; title: string; category: string; meta?: string }[]
  empty: string
  loading?: boolean
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filter?: ReactNode
  onRestore: (id: number) => void
}) {
  const [page, setPage] = useState(0)
  const [target, setTarget] = useState<{ id: number; title: string } | null>(
    null
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const rangeStart = rows.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min(rows.length, (safePage + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SettingsSearchField
          value={search}
          onChange={(value) => {
            onSearchChange(value)
            setPage(0)
          }}
          placeholder={searchPlaceholder}
          className="flex-1"
        />
        {filter}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              {["Item Name", "Category", "Details", "Actions"].map((label) => (
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
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="h-24 px-5 text-center text-sm text-[var(--cls-muted)]"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="h-24 px-5 text-center text-sm text-[var(--cls-muted)]"
                >
                  {empty}
                </TableCell>
              </TableRow>
            ) : null}
            {pageRows.map((row) => (
              <TableRow key={row.id} className="border-[var(--cls-border)]">
                <TableCell className="px-5 py-3.5 text-xs font-medium text-[var(--heading)]">
                  {row.title}
                </TableCell>
                <TableCell className="px-5 py-3.5">
                  <span className="inline-flex rounded-full border border-[var(--cls-border)] bg-[var(--page-wash)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--heading)]">
                    {row.category}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-3.5 text-xs text-[var(--cls-muted)]">
                  {row.meta || "—"}
                </TableCell>
                <TableCell className="px-5 py-3.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setTarget({ id: row.id, title: row.title })}
                  >
                    <ArchiveRestore className="size-3.5" />
                    Restore
                  </Button>
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

      <ConfirmDialog
        open={Boolean(target)}
        title="Restore this record?"
        description={
          target
            ? `Restore "${target.title}"? This fails if an active record already uses the same name.`
            : ""
        }
        confirmLabel="Restore"
        onConfirm={() => {
          if (target) onRestore(target.id)
          setTarget(null)
        }}
        onClose={() => setTarget(null)}
      />
    </div>
  )
}
