import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import { STORAGE_DIRS, uploadFileToStorage } from "@/api/storage/storage.service"
import teachersService from "@/api/teachers/teachers.service"
import usersService from "@/api/users/users.service"
import { ConfirmDialog } from "@/components/app/kit"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"
import { toast } from "@/lib/toast"

import { EditStaffUserModal } from "./edit-staff-user-modal"
import {
  invalidateStaffDirectory,
  useStaffDirectory,
} from "./hooks/use-staff-directory"
import { TEACHER_DETAIL_QUERY_KEY, useTeacherDetail } from "./hooks/use-teacher-detail"
import { canResendStaffInvitation } from "./staff-can-resend-invite"
import { StaffDetailHeader } from "./staff-detail-header"
import { timetableTeacherHref } from "./timetable-staff-links"
import { UserDetailOfficePanel } from "./user-detail-office-panel"
import { UserDetailProfileCard } from "./user-detail-profile-card"
import { UserDetailStatTile } from "./user-detail-stat-tile"
import { UserDetailTeacherPanel } from "./user-detail-teacher-panel"

type Props = {
  userId: string
  onBack: () => void
}

export function StaffDetailPage({ userId, onBack }: Props) {
  const actor = useActor()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState(false)
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: rows = [], isLoading, isError, refetch } = useStaffDirectory()
  const { data: subjects = [] } = useSubjectsList()

  const staff = useMemo(
    () => rows.find((row) => row.id === userId),
    [rows, userId]
  )

  const isTeacher = staff?.role === "teacher"
  const teacherQuery = useTeacherDetail(staff?.teacherId, Boolean(isTeacher))

  useEffect(() => {
    if (!staff) return
    if (staff.role === "super_admin") onBack()
  }, [staff, onBack])

  const timetableHref = useMemo(() => {
    if (!staff || staff.role !== "teacher" || !staff.teacherId) return undefined
    return timetableTeacherHref(actor.role, staff.teacherId)
  }, [actor.role, staff])

  const canResendInvite = staff ? canResendStaffInvitation(actor.role, staff) : false

  async function afterMutation(message: string) {
    await invalidateStaffDirectory(queryClient)
    await queryClient.invalidateQueries({ queryKey: [TEACHER_DETAIL_QUERY_KEY] })
    toast.success(message)
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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not change subject."
      )
    } finally {
      setSaving(false)
    }
  }

  const canManageStaff = useMemo(() => {
    if (!staff) return false
    if (can(actor.role, "staff.create.any")) return true
    return (
      staff.role === "teacher" && can(actor.role, "staff.create.teacher")
    )
  }, [actor.role, staff])

  async function handleEditSave(payload: {
    firstName: string
    lastName: string
    phone: string
    photoFile: File | null
    removePhoto: boolean
  }) {
    if (!staff) return
    setSaving(true)
    try {
      await usersService.update(Number(staff.id), {
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone || null,
        ...(payload.photoFile
          ? { photo: (await uploadFileToStorage(payload.photoFile, STORAGE_DIRS.avatars)).objectKey }
          : payload.removePhoto
            ? { photo: null }
            : {}),
      })
      await afterMutation("Staff profile updated")
      setEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update user.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteStaff() {
    if (!staff) return
    setDeleting(true)
    try {
      await usersService.remove(Number(staff.id))
      toast.success("Staff member removed")
      setDeleteConfirmOpen(false)
      onBack()
      await invalidateStaffDirectory(queryClient)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete user.")
    } finally {
      setDeleting(false)
    }
  }

  async function handleResendInvitation() {
    if (!staff) return
    setResending(true)
    try {
      await usersService.resendInvitation(Number(staff.id))
      toast.success(`Activation email sent to ${staff.email}`)
      setInviteConfirmOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send activation email."
      )
    } finally {
      setResending(false)
    }
  }

  if (isLoading && !staff) {
    return (
      <p className="py-12 text-center text-sm text-[var(--cls-muted)]">
        Loading user…
      </p>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-[var(--cls-muted)]">Could not load user.</p>
        <button
          type="button"
          className="text-sm font-semibold text-[var(--cls-brand)]"
          onClick={() => void refetch()}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-[var(--cls-muted)]">User not found.</p>
        <button
          type="button"
          className="text-sm font-semibold text-[var(--cls-brand)]"
          onClick={onBack}
        >
          Back to directory
        </button>
      </div>
    )
  }

  let classStat = "—"
  if (isTeacher) {
    classStat = String(staff.classLabels.length)
  }

  let subjectStat = "—"
  if (isTeacher) {
    subjectStat = staff.subjectName
  }

  let mainPanel = (
    <UserDetailOfficePanel staff={staff} viewerRole={actor.role} />
  )
  if (isTeacher) {
    mainPanel = (
      <UserDetailTeacherPanel
        staff={staff}
        teacherProfile={teacherQuery.data}
        teacherLoading={teacherQuery.isLoading}
        teacherError={teacherQuery.isError}
        subjects={subjects}
        timetableHref={timetableHref ?? ""}
        viewerRole={actor.role}
        saving={saving}
        onSubjectSave={handleSubjectSave}
        onRetryTeacher={() => void teacherQuery.refetch()}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StaffDetailHeader
        staff={staff}
        onBack={onBack}
        timetableHref={timetableHref}
        canResendInvite={canResendInvite}
        resending={resending}
        onResendInvite={() => setInviteConfirmOpen(true)}
        onEdit={canManageStaff ? () => setEditOpen(true) : undefined}
        onDelete={canManageStaff ? () => setDeleteConfirmOpen(true) : undefined}
        deleting={deleting}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <UserDetailProfileCard staff={staff} />
          <div className="grid grid-cols-2 gap-2">
            <UserDetailStatTile label="Status" value={staff.status} compact />
            <UserDetailStatTile label="Role" value={staff.roleLabel} compact />
            {isTeacher ? (
              <>
                <UserDetailStatTile label="Subject" value={subjectStat} compact />
                <UserDetailStatTile label="Classes" value={classStat} compact />
              </>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
          <div className="mb-6 border-b border-[var(--cls-border)] pb-4">
            <h2 className="text-base font-semibold text-[var(--cls-ink)]">
              {isTeacher ? "Teaching & assignments" : "Role & portal access"}
            </h2>
            <p className="mt-1 text-sm text-[var(--cls-muted)]">
              {isTeacher
                ? "Subject, classes, history, and timetable for this teacher."
                : "How this account is used across school operations."}
            </p>
          </div>
          {mainPanel}
        </div>
      </div>

      <EditStaffUserModal
        open={editOpen}
        onOpenChange={setEditOpen}
        staff={staff}
        saving={saving}
        onSubmit={handleEditSave}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete staff member?"
        description={
          staff.role === "teacher" && staff.classLabels.length > 0
            ? `${staff.name} is still linked to classes. Remove timetable and class assignments first, or deletion will be blocked.`
            : `Remove ${staff.name} from the staff directory? Their login will be archived.`
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting…"
        confirming={deleting}
        onConfirm={() => void handleDeleteStaff()}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false)
        }}
      />

      <ConfirmDialog
        open={inviteConfirmOpen}
        title="Send activation email?"
        description={`We will email ${staff.email} a secure link to set their password and activate portal access. Any previous invite link may stop working.`}
        confirmLabel="Send email"
        confirmingLabel="Sending…"
        confirming={resending}
        onConfirm={() => void handleResendInvitation()}
        onClose={() => {
          if (!resending) setInviteConfirmOpen(false)
        }}
      />
    </div>
  )
}
