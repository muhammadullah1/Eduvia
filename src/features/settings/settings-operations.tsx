import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import schoolCatalogService from "@/api/settings/school-catalog.service"
import subjectsService from "@/api/subjects/subjects.service"
import usersService from "@/api/users/users.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArchivedClassesPanel } from "@/features/management/classes/archived-classes-panel"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { PERMISSION_ENTRIES, ROLE_LABELS } from "@/lib/permissions"
import { ALL_ROLES } from "@/lib/auth"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

const LOCATION_TYPES = [
  "classroom",
  "lab",
  "auditorium",
  "gym",
  "library",
  "playground",
  "online",
  "other",
] as const

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function BlockDatesPanel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [description, setDescription] = useState("")

  const query = useQuery({
    queryKey: ["block-dates", search],
    queryFn: () =>
      schoolCatalogService.listBlockDates({ search: search || undefined }),
  })

  const create = useMutation({
    mutationFn: () =>
      schoolCatalogService.createBlockDate({
        name: name.trim(),
        startDate,
        endDate: endDate || startDate,
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      setName("")
      setStartDate("")
      setEndDate("")
      setDescription("")
      await queryClient.invalidateQueries({ queryKey: ["block-dates"] })
      toast.success("Block date saved")
    },
    onError: (err) => toast.error(errorMessage(err, "Could not save block date.")),
  })

  const archive = useMutation({
    mutationFn: (id: number) => schoolCatalogService.archiveBlockDate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["block-dates"] })
      toast.success("Block date archived")
    },
    onError: (err) => toast.error(errorMessage(err, "Could not archive.")),
  })

  const rows = query.data ?? []

  return (
    <div className="space-y-5">
      <form
        className="grid gap-3 rounded-xl border border-[var(--cls-border)] bg-[var(--page-wash)]/40 p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Holiday or event name"
            required
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Start</Label>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="Start date"
            defaultMonthKind="today"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">End</Label>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            placeholder="End date"
            defaultMonthKind="today"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Add block date"}
          </Button>
        </div>
      </form>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search block dates…"
      />
      {query.isError ? (
        <p className="text-sm text-destructive">Could not load block dates.</p>
      ) : null}
      <ul className="divide-y divide-[var(--cls-border)] rounded-xl border border-[var(--cls-border)]">
        {rows.length === 0 && !query.isLoading ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--cls-muted)]">
            No active block dates.
          </li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--cls-ink)]">{row.name}</p>
              <p className="text-xs text-[var(--cls-muted)]">
                {row.startDate} – {row.endDate} · {row.dateType}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => archive.mutate(row.id)}
            >
              Archive
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LocationsPanel() {
  const queryClient = useQueryClient()
  const sessions = useSessionsList()
  const current = (sessions.data ?? []).find((row) => row.current) ?? sessions.data?.[0]
  const [sessionId, setSessionId] = useState("")
  const activeSession = sessionId || current?.id || ""
  const [search, setSearch] = useState("")
  const [name, setName] = useState("")
  const [locationCode, setLocationCode] = useState("")
  const [locationType, setLocationType] = useState<string>("classroom")
  const [capacity, setCapacity] = useState("30")

  const query = useQuery({
    queryKey: ["locations", activeSession, search],
    enabled: Boolean(activeSession),
    queryFn: () =>
      schoolCatalogService.listLocations({
        search: search || undefined,
        sessionId: Number(activeSession),
      }),
  })

  const create = useMutation({
    mutationFn: () =>
      schoolCatalogService.createLocation({
        name: name.trim(),
        fkSessionId: Number(activeSession),
        locationCode: locationCode.trim() || null,
        locationType,
        capacity: Number(capacity),
      }),
    onSuccess: async () => {
      setName("")
      setLocationCode("")
      await queryClient.invalidateQueries({ queryKey: ["locations"] })
      toast.success("Location saved")
    },
    onError: (err) => toast.error(errorMessage(err, "Could not save location.")),
  })

  const archive = useMutation({
    mutationFn: (id: number) => schoolCatalogService.archiveLocation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["locations"] })
      toast.success("Location archived")
    },
    onError: (err) => toast.error(errorMessage(err, "Could not archive.")),
  })

  const rows = query.data ?? []

  return (
    <div className="space-y-5">
      <form
        className="grid gap-3 rounded-xl border border-[var(--cls-border)] bg-[var(--page-wash)]/40 p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-xs">Session</Label>
          <Select value={activeSession} onValueChange={setSessionId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Choose a session" />
            </SelectTrigger>
            <SelectContent>
              {(sessions.data ?? []).map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name}
                  {session.current ? " · Current" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Location name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Location code</Label>
          <Input
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Type</Label>
          <Select value={locationType} onValueChange={setLocationType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOCATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Capacity</Label>
          <Input
            inputMode="numeric"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending || !activeSession}>
            {create.isPending ? "Saving…" : "Add location"}
          </Button>
        </div>
      </form>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search locations…"
      />
      <ul className="divide-y divide-[var(--cls-border)] rounded-xl border border-[var(--cls-border)]">
        {rows.length === 0 && !query.isLoading ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--cls-muted)]">
            No active locations in this session.
          </li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--cls-ink)]">{row.name}</p>
              <p className="text-xs text-[var(--cls-muted)]">
                {row.locationCode ? `${row.locationCode} · ` : ""}
                {row.locationType ?? "room"} · capacity {row.capacity}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => archive.mutate(row.id)}>
              Archive
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ArchiveKind = "classes" | "subjects" | "staff" | "locations" | "dates"

export function ArchivesHub() {
  const [kind, setKind] = useState<ArchiveKind>("classes")
  const tabs: { id: ArchiveKind; label: string }[] = [
    { id: "classes", label: "Classes" },
    { id: "subjects", label: "Subjects" },
    { id: "staff", label: "Staff" },
    { id: "locations", label: "Locations" },
    { id: "dates", label: "Block dates" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setKind(tab.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              kind === tab.id
                ? "border-[var(--cls-brand)] bg-[var(--cls-brand)] text-white"
                : "border-[var(--cls-border)] text-[var(--cls-ink)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {kind === "classes" ? <ArchivedClassesPanel embedded /> : null}
      {kind === "subjects" ? <ArchivedSubjects /> : null}
      {kind === "staff" ? <ArchivedStaff /> : null}
      {kind === "locations" ? <ArchivedLocations /> : null}
      {kind === "dates" ? <ArchivedBlockDates /> : null}
    </div>
  )
}

function ArchivedSubjects() {
  const queryClient = useQueryClient()
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
    onError: (err) => toast.error(errorMessage(err, "Could not restore subject.")),
  })
  const rows = query.data ?? []
  return (
    <ArchiveList
      empty="No archived subjects."
      loading={query.isLoading}
      rows={rows.map((row) => ({
        id: row.id,
        title: row.name,
        meta: row.code,
      }))}
      onRestore={(id) => restore.mutate(id)}
    />
  )
}

function ArchivedStaff() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["users", "archived"],
    queryFn: () => usersService.list({ archived: true, pageSize: 200 }),
  })
  const restore = useMutation({
    mutationFn: (id: number) => usersService.restore(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Staff restored")
    },
    onError: (err) => toast.error(errorMessage(err, "Could not restore staff.")),
  })
  const rows = query.data?.users ?? []
  return (
    <ArchiveList
      empty="No archived staff."
      loading={query.isLoading}
      rows={rows.map((row) => ({
        id: row.id,
        title: `${row.firstName} ${row.lastName}`,
        meta: `${row.email} · ${row.role}`,
      }))}
      onRestore={(id) => restore.mutate(id)}
    />
  )
}

function ArchivedLocations() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["locations", "archived"],
    queryFn: () => schoolCatalogService.listLocations({ archived: true }),
  })
  return (
    <ArchiveList
      empty="No archived rooms."
      loading={query.isLoading}
      rows={(query.data ?? []).map((row) => ({
        id: row.id,
        title: row.name,
        meta: row.locationCode || row.locationType || "Location",
      }))}
      onRestore={(id) => {
        void schoolCatalogService.restoreLocation(id).then(async () => {
          await queryClient.invalidateQueries({ queryKey: ["locations"] })
          toast.success("Room restored")
        }).catch((err) => toast.error(errorMessage(err, "Could not restore.")))
      }}
    />
  )
}

function ArchivedBlockDates() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["block-dates", "archived"],
    queryFn: () => schoolCatalogService.listBlockDates({ archived: true }),
  })
  return (
    <ArchiveList
      empty="No archived block dates."
      loading={query.isLoading}
      rows={(query.data ?? []).map((row) => ({
        id: row.id,
        title: row.name,
        meta: `${row.startDate} – ${row.endDate}`,
      }))}
      onRestore={(id) => {
        void schoolCatalogService.restoreBlockDate(id).then(async () => {
          await queryClient.invalidateQueries({ queryKey: ["block-dates"] })
          toast.success("Block date restored")
        }).catch((err) => toast.error(errorMessage(err, "Could not restore.")))
      }}
    />
  )
}

function ArchiveList({
  rows,
  empty,
  loading,
  onRestore,
  restoringId,
}: {
  rows: { id: number; title: string; meta?: string }[]
  empty: string
  loading?: boolean
  onRestore: (id: number) => void
  restoringId?: number | null
}) {
  const [target, setTarget] = useState<{ id: number; title: string } | null>(null)
  return (
    <>
      <ul className="divide-y divide-[var(--cls-border)] rounded-xl border border-[var(--cls-border)]">
        {loading ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--cls-muted)]">Loading…</li>
        ) : null}
        {!loading && rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-[var(--cls-muted)]">{empty}</li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{row.title}</p>
              {row.meta ? <p className="text-xs text-[var(--cls-muted)]">{row.meta}</p> : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={restoringId === row.id}
              onClick={() => setTarget({ id: row.id, title: row.title })}
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
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
    </>
  )
}

export function RolesPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--cls-muted)]">
        CLS uses fixed school roles. The API enforces this matrix. Attendance is a
        product permission, not a settings page. Fine-grained per-user grants from
        ASAMAN are not part of this product.
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--cls-border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--page-wash)] text-xs uppercase text-[var(--cls-muted)]">
            <tr>
              <th className="px-3 py-2">Capability</th>
              {ALL_ROLES.map((role) => (
                <th key={role} className="px-3 py-2">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ENTRIES.map(([key, roles]) => (
              <tr key={key} className="border-t border-[var(--cls-border)]">
                <td className="px-3 py-2 font-medium">{key}</td>
                {ALL_ROLES.map((role) => (
                  <td key={role} className="px-3 py-2">
                    {roles.includes(role) ? "Yes" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
