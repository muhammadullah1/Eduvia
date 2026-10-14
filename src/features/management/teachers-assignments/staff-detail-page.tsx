import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import teachersService from "@/api/teachers/teachers.service"
import { useSchool } from "@/data/store"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { toast } from "@/lib/toast"

import {
  invalidateStaffDirectory,
  useStaffDirectory,
} from "./hooks/use-staff-directory"
import { TEACHER_DETAIL_QUERY_KEY, useTeacherDetail } from "./hooks/use-teacher-detail"
import { StaffDetailHeader } from "./staff-detail-header"
import {
  StaffDetailFields,
  StaffDetailSection,
} from "./staff-detail-section"
import { UserDetailOfficePanel } from "./user-detail-office-panel"
import { UserDetailStatTile } from "./user-detail-stat-tile"
import { UserDetailTeacherPanel } from "./user-detail-teacher-panel"

type Props = {
  userId: string
  onBack: () => void
}

export function StaffDetailPage({ userId, onBack }: Props) {
  const { syncPortalForRoute } = useSchool()
  const actor = useActor()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: rows = [], isLoading, isError, refetch } = useStaffDirectory()
  const { data: subjects = [] } = useSubjectsList()

  const staff = useMemo(
    () => rows.find((row) => row.id === userId),
    [rows, userId]
  )

  const isTeacher = staff?.role === "teacher"
  const teacherQuery = useTeacherDetail(staff?.teacherId, Boolean(isTeacher))

  useEffect(() => {
    void syncPortalForRoute(actor.role, "teachers-assignments")
  }, [actor.role, syncPortalForRoute])

  useEffect(() => {
    if (!staff) return
    if (staff.role === "super_admin") onBack()
  }, [staff, onBack])

  const timetableHref = portalPath(actor.role, "timetable")

  async function afterMutation(message: string) {
    await invalidateStaffDirectory(queryClient)
    await queryClient.invalidateQueries({ queryKey: [TEACHER_DETAIL_QUERY_KEY] })
    await syncPortalForRoute(actor.role, "teachers-assignments")
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

  const profileFields = [
    { label: "Full name", value: staff.name },
    { label: "Email", value: staff.email },
    { label: "Phone", value: staff.phone },
    { label: "Portal role", value: staff.roleLabel },
  ]

  let classStat = "—"
  if (isTeacher) {
    classStat = String(staff.classLabels.length)
  }

  let subjectStat = "—"
  if (isTeacher) {
    subjectStat = staff.subjectName
  }

  return (
    <div className="flex flex-col gap-6">
      <StaffDetailHeader
        staff={staff}
        onBack={onBack}
        timetableHref={timetableHref}
      />

      <div className="flex flex-wrap gap-3">
        <UserDetailStatTile label="Account status" value={staff.status} />
        <UserDetailStatTile label="Role" value={staff.roleLabel} />
        {isTeacher ? (
          <>
            <UserDetailStatTile label="Subject" value={subjectStat} />
            <UserDetailStatTile label="Classes" value={classStat} />
          </>
        ) : null}
      </div>

      <StaffDetailSection
        title="Profile"
        description="Core account information for this portal user."
      >
        <StaffDetailFields items={profileFields} />
      </StaffDetailSection>

      {isTeacher ? (
        <UserDetailTeacherPanel
          staff={staff}
          teacherProfile={teacherQuery.data}
          teacherLoading={teacherQuery.isLoading}
          teacherError={teacherQuery.isError}
          subjects={subjects}
          timetableHref={timetableHref}
          viewerRole={actor.role}
          saving={saving}
          onSubjectSave={handleSubjectSave}
          onRetryTeacher={() => void teacherQuery.refetch()}
        />
      ) : (
        <UserDetailOfficePanel staff={staff} viewerRole={actor.role} />
      )}
    </div>
  )
}
