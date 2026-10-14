import { Lightbulb, Plus, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import usersService from "@/api/users/users.service"
import teachersService from "@/api/teachers/teachers.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useClientPagination } from "@/hooks/use-client-pagination"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { toast } from "@/lib/toast"

import {
  CreateStaffUserModal,
  type CreateStaffPayload,
} from "./create-staff-user-modal"
import {
  invalidateStaffDirectory,
  useStaffDirectory,
} from "./hooks/use-staff-directory"
import { OfficeStaffTable } from "./office-staff-table"
import { TeacherEditSheet } from "./teacher-edit-sheet"
import { TeachersClsTable } from "./teachers-cls-table"
import { TeachingAssignmentsSheet } from "./teaching-assignments-sheet"

type PageView = "teachers" | "office"

type Props = {
  globalQuery: string
  initialTeacherId?: string
}

const OFFICE_ROLES = new Set([
  "operations_manager",
  "accountant",
  "super_admin",
])

export function TeachersAssignmentsPage({
  globalQuery,
  initialTeacherId,
}: Props) {
  const { syncPortalForRoute } = useSchool()
  const actor = useActor()
  const queryClient = useQueryClient()
  const [view, setView] = useState<PageView>("teachers")
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assignmentsOpen, setAssignmentsOpen] = useState(false)
  const [editTeacher, setEditTeacher] = useState<StaffDirectoryRow | null>(null)

  useEffect(() => {
    void syncPortalForRoute(actor.role, "teachers-assignments")
  }, [actor.role, syncPortalForRoute])

  const { data: rows = [], isLoading, isError, refetch } = useStaffDirectory()
  const { data: subjects = [] } = useSubjectsList()

  const teachers = useMemo(
    () => rows.filter((row) => row.role === "teacher"),
    [rows]
  )
  const officeStaff = useMemo(
    () => rows.filter((row) => OFFICE_ROLES.has(row.role)),
    [rows]
  )

  useEffect(() => {
    if (!initialTeacherId || rows.length === 0) return
    const match = rows.find((row) => row.id === initialTeacherId)
    if (match && match.role === "teacher") {
      setEditTeacher(match)
      setView("teachers")
    }
  }, [initialTeacherId, rows])

  const activeTeacherCount = teachers.filter(
    (row) => row.status.toLowerCase() === "active"
  ).length

  const needle = (search || globalQuery).trim().toLowerCase()
  const sourceRows = view === "teachers" ? teachers : officeStaff

  const filtered = useMemo(() => {
    if (!needle) return sourceRows
    return sourceRows.filter((row) =>
      [row.name, row.email, row.phone, row.subjectName, row.roleLabel]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
  }, [sourceRows, needle, view])

  const { paginatedItems, pagination } = useClientPagination(filtered)

  const timetableHref = portalPath(actor.role, "timetable")

  async function afterMutation(message: string) {
    await invalidateStaffDirectory(queryClient)
    await syncPortalForRoute(actor.role, "teachers-assignments")
    toast.success(message)
  }

  async function handleCreate(payload: CreateStaffPayload) {
    setSaving(true)
    try {
      await usersService.create({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone || null,
        password: payload.password,
        role: payload.role,
        subjectId: payload.subjectId,
        employeeCode: payload.employeeCode ?? null,
      })
      await afterMutation("Staff member created")
      setModalOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create staff member."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSubjectSave(payload: {
    teacherId: number
    subjectId: number
    reason: string
  }) {
    setSaving(true)
    try {
      await teachersService.changeSubject(payload.teacherId, {
        subjectId: payload.subjectId,
        reason: payload.reason || undefined,
      })
      await afterMutation("Teacher subject updated")
      setEditTeacher(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not change subject."
      )
    } finally {
      setSaving(false)
    }
  }

  function openAdd() {
    setModalOpen(true)
  }

  let subtitle = `${activeTeacherCount} active teacher`
  if (activeTeacherCount !== 1) subtitle = `${activeTeacherCount} active teachers`

  let primaryLabel = "Add teacher"
  if (view === "office") primaryLabel = "Add staff"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--cls-brand)]">
            Teachers &amp; Assignments
          </h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {view === "teachers" ? (
            <Button
              type="button"
              variant="outline"
              className="border-[var(--cls-border)]"
              onClick={() => setAssignmentsOpen(true)}
            >
              Teaching assignments
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={openAdd}
          >
            <Plus data-icon="inline-start" />
            {primaryLabel}
          </Button>
        </div>
      </div>

      <ClsSubTabs
        variant="underline"
        aria-label="Teachers and office staff"
        value={view}
        onValueChange={(value) => setView(value as PageView)}
        items={[
          { value: "teachers", label: "Teachers", count: teachers.length },
          {
            value: "office",
            label: "Office accounts",
            count: officeStaff.length,
          },
        ]}
      />

      {view === "teachers" ? (
        <div
          className="flex gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50/90 px-4 py-3 text-xs leading-relaxed text-blue-950"
          role="note"
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden />
          <p>
            <strong className="font-semibold">One subject per teacher:</strong>{" "}
            Each teacher has exactly one primary teaching subject. Marks and
            lesson updates are recorded under that subject.
          </p>
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white px-6 py-12 text-center">
          <p className="text-sm text-[var(--cls-muted)]">Could not load staff.</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !isLoading && sourceRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <Users className="size-6" />
          </div>
          <p className="text-base font-medium text-[var(--cls-ink)]">
            {view === "teachers" ? "No teachers yet" : "No office accounts"}
          </p>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            onClick={openAdd}
          >
            <Plus data-icon="inline-start" />
            {primaryLabel}
          </Button>
        </div>
      ) : null}

      {!isError && (isLoading || sourceRows.length > 0) ? (
        view === "teachers" ? (
          <TeachersClsTable
            rows={paginatedItems}
            search={search}
            onSearchChange={setSearch}
            loading={isLoading}
            searchActive={Boolean(needle)}
            onClearSearch={() => setSearch("")}
            onOpenTeacher={setEditTeacher}
            pagination={pagination}
          />
        ) : (
          <OfficeStaffTable
            rows={paginatedItems}
            search={search}
            onSearchChange={setSearch}
            loading={isLoading}
            searchActive={Boolean(needle)}
            onClearSearch={() => setSearch("")}
            pagination={pagination}
          />
        )
      ) : null}

      <CreateStaffUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        actorRole={actor.role}
        subjects={subjects}
        saving={saving}
        onSubmit={handleCreate}
        defaultRole={view === "office" ? "operations_manager" : "teacher"}
      />

      <TeacherEditSheet
        teacher={editTeacher}
        open={Boolean(editTeacher)}
        subjects={subjects}
        timetableHref={timetableHref}
        saving={saving}
        onClose={() => setEditTeacher(null)}
        onSave={handleSubjectSave}
      />

      <TeachingAssignmentsSheet
        open={assignmentsOpen}
        teachers={teachers}
        timetableHref={timetableHref}
        onClose={() => setAssignmentsOpen(false)}
      />
    </div>
  )
}
