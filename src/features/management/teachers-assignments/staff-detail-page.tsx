import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import teachersService from "@/api/teachers/teachers.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { useSchool } from "@/data/store"
import { useSubjectsList } from "@/features/management/subjects/hooks/use-subjects"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { toast } from "@/lib/toast"

import {
  invalidateStaffDirectory,
  useStaffDirectory,
} from "./hooks/use-staff-directory"
import { StaffDetailAssignmentsTab } from "./staff-detail-assignments-tab"
import { StaffDetailHeader } from "./staff-detail-header"
import { StaffDetailOverviewTab } from "./staff-detail-overview-tab"
import { StaffDetailSubjectTab } from "./staff-detail-subject-tab"
import { StaffDetailSummaryCard } from "./staff-detail-summary-card"
import {
  staffDetailTabsForRole,
  type StaffDetailTabId,
} from "./staff-detail-tabs"

type Props = {
  userId: string
  tab: StaffDetailTabId
  onTabChange: (tab: StaffDetailTabId) => void
  onBack: () => void
}

const TEACHER_TAB_ITEMS = [
  { value: "overview", label: "Profile" },
  { value: "subject", label: "Subject" },
  { value: "assignments", label: "Classes" },
]

export function StaffDetailPage({
  userId,
  tab,
  onTabChange,
  onBack,
}: Props) {
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

  const fallbackTabs: StaffDetailTabId[] = ["overview"]
  const allowedTabs = staff
    ? staffDetailTabsForRole(staff.role)
    : fallbackTabs
  const activeTab = allowedTabs.includes(tab) ? tab : allowedTabs[0]
  const isTeacher = staff?.role === "teacher"

  const tabCorrected = useRef(false)
  useEffect(() => {
    tabCorrected.current = false
  }, [userId])

  useEffect(() => {
    if (!staff || tabCorrected.current) return
    if (!allowedTabs.includes(tab)) {
      tabCorrected.current = true
      onTabChange(allowedTabs[0])
    }
  }, [staff, tab, allowedTabs, onTabChange])

  const tabItems = TEACHER_TAB_ITEMS.filter((item) =>
    allowedTabs.includes(item.value as StaffDetailTabId)
  )

  const timetableHref = portalPath(actor.role, "timetable")

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
        Loading staff member…
      </p>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-[var(--cls-muted)]">Could not load staff.</p>
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
        <p className="text-sm text-[var(--cls-muted)]">Staff member not found.</p>
        <button
          type="button"
          className="text-sm font-semibold text-[var(--cls-brand)]"
          onClick={onBack}
        >
          Back to list
        </button>
      </div>
    )
  }

  let tabPanel = null
  if (activeTab === "overview") {
    tabPanel = <StaffDetailOverviewTab staff={staff} />
  }
  if (activeTab === "subject") {
    tabPanel = (
      <StaffDetailSubjectTab
        staff={staff}
        subjects={subjects}
        saving={saving}
        onSave={handleSubjectSave}
      />
    )
  }
  if (activeTab === "assignments") {
    tabPanel = (
      <StaffDetailAssignmentsTab staff={staff} timetableHref={timetableHref} />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <StaffDetailHeader staff={staff} onBack={onBack} />

      <StaffDetailSummaryCard
        staff={staff}
        isTeacher={Boolean(isTeacher)}
        timetableHref={timetableHref}
        onGoToTab={isTeacher ? onTabChange : undefined}
      />

      {isTeacher ? (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-4 pt-4 pb-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <ClsSubTabs
            items={tabItems}
            value={activeTab}
            onValueChange={(value) => onTabChange(value as StaffDetailTabId)}
            variant="segmented"
            aria-label="Teacher detail"
          />
          <div className="mt-6">{tabPanel}</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--cls-border)] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="mb-4 text-sm font-semibold text-[var(--cls-ink)]">
            Profile
          </h2>
          <StaffDetailOverviewTab staff={staff} />
        </div>
      )}
    </div>
  )
}
