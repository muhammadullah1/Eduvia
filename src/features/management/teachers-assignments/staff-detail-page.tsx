import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"

import teachersService from "@/api/teachers/teachers.service"
import { Button } from "@/components/ui/button"
import { useSchool } from "@/data/store"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { toast } from "@/lib/toast"

import { ClsSubjectBadge } from "./cls-subject-badge"
import { shortenClassLabel } from "./format-class-label"
import {
  invalidateStaffDirectory,
  useStaffDirectory,
} from "./hooks/use-staff-directory"
import { StaffDetailAssignmentsTab } from "./staff-detail-assignments-tab"
import { StaffDetailHeader } from "./staff-detail-header"
import {
  StaffDetailFields,
  StaffDetailSection,
} from "./staff-detail-section"
import { StaffDetailSubjectTab } from "./staff-detail-subject-tab"

type Props = {
  userId: string
  onBack: () => void
}

function staffIdLabel(employeeCode: string, userId: string) {
  if (employeeCode && employeeCode !== "—") return employeeCode
  return `User #${userId}`
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

  useEffect(() => {
    void syncPortalForRoute(actor.role, "teachers-assignments")
  }, [actor.role, syncPortalForRoute])

  const timetableHref = portalPath(actor.role, "timetable")
  const isTeacher = staff?.role === "teacher"

  async function afterMutation(message: string) {
    await invalidateStaffDirectory(queryClient)
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
    { label: "Account status", value: staff.status },
    { label: "Employee / staff ID", value: staffIdLabel(staff.employeeCode, staff.id) },
  ]

  return (
    <div className="flex flex-col gap-5">
      <StaffDetailHeader staff={staff} onBack={onBack} />

      <div className="grid gap-5 lg:grid-cols-2">
        <StaffDetailSection
          title="Profile"
          description="Account and contact details for this portal user."
        >
          <StaffDetailFields items={profileFields} />
        </StaffDetailSection>

        {isTeacher ? (
          <StaffDetailSection
            title="Teaching overview"
            description="Summary of this teacher's subject and class load."
          >
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-[var(--cls-muted)]">
                  Assigned subject
                </p>
                <div className="mt-2">
                  <ClsSubjectBadge label={staff.subjectName} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--cls-muted)]">
                  Classes on timetable
                </p>
                {staff.classLabels.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--cls-muted)]">
                    Not assigned to any class yet.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {staff.classLabels.map((label) => (
                      <li
                        key={label}
                        className="rounded-full border border-[var(--cls-border)] bg-[var(--page-wash)] px-2.5 py-0.5 text-xs font-medium text-[var(--cls-ink)]"
                      >
                        {shortenClassLabel(label)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit border-[var(--cls-border)]"
                asChild
              >
                <Link to={timetableHref}>Manage on timetable</Link>
              </Button>
            </div>
          </StaffDetailSection>
        ) : null}
      </div>

      {isTeacher ? (
        <>
          <StaffDetailSection
            title="Assigned subject"
            description="Each teacher has one primary subject in the catalog."
          >
            <StaffDetailSubjectTab
              staff={staff}
              subjects={subjects}
              saving={saving}
              onSave={handleSubjectSave}
            />
          </StaffDetailSection>

          <StaffDetailSection
            title="Class assignments"
            description="Classes are assigned on the weekly timetable."
          >
            <StaffDetailAssignmentsTab
              staff={staff}
              timetableHref={timetableHref}
            />
          </StaffDetailSection>
        </>
      ) : null}
    </div>
  )
}
