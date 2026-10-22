import { useQueryClient } from "@tanstack/react-query"
import { Lightbulb, Plus, Users } from "lucide-react"
import { useMemo, useState } from "react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { STORAGE_DIRS, uploadFileToStorage } from "@/api/storage/storage.service"
import usersService from "@/api/users/users.service"
import { ConfirmDialog } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useActor } from "@/lib/actor"
import type { Role } from "@/lib/auth"
import { toast } from "@/lib/toast"

import {
  type CreateStaffPayload,
  CreateStaffUserModal,
} from "./create-staff-user-modal"
import {
  invalidateStaffDirectory,
  useStaffDirectory,
} from "./hooks/use-staff-directory"
import {
  StaffDirectoryTable,
  type StaffRoleFilter,
} from "./staff-directory-table"

type Props = {
  globalQuery: string
  onOpenUser?: (row: StaffDirectoryRow) => void
}

const STAFF_ROLES_ORDER: Role[] = [
  "teacher",
  "operations_manager",
  "accountant",
]

function rowMatchesRole(row: StaffDirectoryRow, roleFilter: StaffRoleFilter) {
  if (roleFilter === "all") return true
  return row.role === roleFilter
}

function activeStaffCount(rows: StaffDirectoryRow[]) {
  let count = 0
  for (const row of rows) {
    if (row.status.toLowerCase() === "active") count += 1
  }
  return count
}

function subtitleForCount(count: number) {
  if (count === 1) return "1 active staff member"
  return `${count} active staff members`
}

export function TeachersAssignmentsPage({
  globalQuery,
  onOpenUser,
}: Props) {
  const actor = useActor()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StaffDirectoryRow | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)

  const { data: rows = [], isLoading, isError, refetch } = useStaffDirectory()
  const { data: subjects = [] } = useSubjectsList()

  const roleOptions = useMemo(() => {
    const present = new Set(rows.map((row) => row.role))
    return STAFF_ROLES_ORDER.filter((role) => present.has(role))
  }, [rows])

  const needle = (search || globalQuery).trim().toLowerCase()
  const filtered = useMemo(() => {
    const base = rows.filter((row) => rowMatchesRole(row, roleFilter))
    if (!needle) return base
    return base.filter((row) =>
      [row.name, row.email, row.phone, row.roleLabel]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [rows, roleFilter, needle])

  const { paginatedItems, pagination } = useClientPagination(filtered)

  const activeCount = activeStaffCount(rows)
  const subtitle = subtitleForCount(activeCount)

  async function afterMutation(message: string) {
    await invalidateStaffDirectory(queryClient)
    toast.success(message)
  }

  async function handleDeleteStaff() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await usersService.remove(Number(deleteTarget.id))
      await afterMutation("Staff member removed")
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete user.")
    } finally {
      setDeleting(false)
    }
  }

  async function handleCreate(payload: CreateStaffPayload) {
    setSaving(true)
    try {
      await usersService.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone || null,
        role: payload.role,
        subjectId: payload.subjectId,
        employeeCode: payload.employeeCode ?? null,
        photo: payload.photoFile
          ? (await uploadFileToStorage(payload.photoFile, STORAGE_DIRS.avatars)).objectKey
          : null,
        password: payload.password,
      })
      await afterMutation("Staff member created")
      setModalOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create staff member."
      if (message.includes("invitation email")) {
        await invalidateStaffDirectory(queryClient)
        setModalOpen(false)
      }
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function clearFilters() {
    setSearch("")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
            Staff
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">{subtitle}</p>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
          onClick={() => setModalOpen(true)}
        >
          <Plus data-icon="inline-start" />
          Add staff
        </Button>
      </div>

      <div
        className="flex gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50/90 px-4 py-3 text-xs leading-relaxed text-blue-950"
        role="note"
      >
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />
        <p>
          <strong className="font-semibold">One subject per teacher:</strong>{" "}
          Teachers have one primary subject. Open a user to view status,
          assignments, and teaching details.
        </p>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--cls-muted)]">Could not load staff.</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !isLoading && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <Users className="size-6" />
          </div>
          <p className="text-base font-medium text-[var(--cls-ink)]">
            No staff yet
          </p>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={() => setModalOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Add staff
          </Button>
        </div>
      ) : (
        <StaffDirectoryTable
          rows={paginatedItems}
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          roleOptions={roleOptions}
          loading={isLoading}
          searchActive={Boolean(needle)}
          onClearSearch={clearFilters}
          onOpenUser={onOpenUser}
          actorRole={actor.role}
          onEditUser={onOpenUser}
          onDeleteUser={(row) => setDeleteTarget(row)}
          pagination={pagination}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete staff member?"
        description={
          deleteTarget?.role === "teacher"
            ? `${deleteTarget.name} cannot be deleted if they still have class or timetable assignments.`
            : `Remove ${deleteTarget?.name ?? "this user"} from the portal? This cannot be undone.`
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={() => void handleDeleteStaff()}
        onClose={() => !deleting && setDeleteTarget(null)}
      />

      <CreateStaffUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        actorRole={actor.role}
        subjects={subjects}
        saving={saving}
        onSubmit={handleCreate}
      />
    </div>
  )
}
