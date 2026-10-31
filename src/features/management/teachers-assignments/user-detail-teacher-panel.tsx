import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import type { SubjectRow } from "@/api/subjects/map-subject"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCan } from "@/lib/access"
import type { ApiTeacher } from "@/lib/api-types"

import { ClsSubjectBadge } from "./cls-subject-badge"
import { shortenClassLabel } from "./format-class-label"
import { StaffDetailAssignmentsTab } from "./staff-detail-assignments-tab"
import {
  StaffDetailFields,
  StaffDetailSection,
} from "./staff-detail-section"
import { StaffDetailSubjectTab } from "./staff-detail-subject-tab"

type Props = {
  staff: StaffDirectoryRow
  teacherProfile?: ApiTeacher | null
  teacherLoading?: boolean
  teacherError?: boolean
  subjects: SubjectRow[]
  timetableHref: string
  saving?: boolean
  onSubjectSave: (payload: {
    teacherId: number
    subjectId: number
    reason: string
  }) => Promise<void>
  onRetryTeacher?: () => void
}

function formatHistoryDate(value?: string | null) {
  if (!value) return "Present"
  return value
}

export function UserDetailTeacherPanel({
  staff,
  teacherProfile,
  teacherLoading = false,
  teacherError = false,
  subjects,
  timetableHref,
  saving = false,
  onSubjectSave,
  onRetryTeacher,
}: Props) {
  const can = useCan()
  const canChangeSubject = can("teachers.manage")
  const history = teacherProfile?.subjectHistory ?? []

  const identityFields = [
    { label: "Employee code", value: staff.employeeCode },
    { label: "Teacher profile ID", value: staff.teacherId ?? "—" },
    { label: "Portal user ID", value: staff.id },
  ]

  let historyBody = null
  if (teacherLoading) {
    historyBody = (
      <p className="text-sm text-[var(--cls-muted)]">Loading subject history…</p>
    )
  }
  if (teacherError) {
    historyBody = (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--cls-muted)]">
          Could not load subject history.
        </p>
        {onRetryTeacher ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetryTeacher}>
            Retry
          </Button>
        ) : null}
      </div>
    )
  }
  if (!teacherLoading && !teacherError && history.length === 0) {
    historyBody = (
      <p className="text-sm text-[var(--cls-muted)]">
        No subject assignment history recorded yet.
      </p>
    )
  }
  if (!teacherLoading && !teacherError && history.length > 0) {
    historyBody = (
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs text-[var(--cls-muted)]">Subject</TableHead>
            <TableHead className="text-xs text-[var(--cls-muted)]">From</TableHead>
            <TableHead className="text-xs text-[var(--cls-muted)]">To</TableHead>
            <TableHead className="text-xs text-[var(--cls-muted)]">Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((row) => (
            <TableRow key={row.id} className="border-[var(--cls-border)]">
              <TableCell className="text-sm font-medium">
                {row.subject?.name ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-[var(--cls-muted)]">
                {formatHistoryDate(row.effectiveFrom)}
              </TableCell>
              <TableCell className="text-sm text-[var(--cls-muted)]">
                {formatHistoryDate(row.effectiveTo)}
              </TableCell>
              <TableCell className="text-sm text-[var(--cls-muted)]">
                {row.reason?.trim() || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  const classRows = teacherProfile?.classes ?? []
  let classList = null
  if (classRows.length === 0) {
    classList = (
      <p className="text-sm text-[var(--cls-muted)]">
        No classes linked on this teacher profile. Timetable slots may still
        assign periods separately.
      </p>
    )
  } else {
    classList = (
      <ul className="divide-y divide-[var(--cls-border)] rounded-lg border border-[var(--cls-border)]">
        {classRows.map((klass) => (
          <li
            key={klass.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span className="font-medium text-[var(--cls-ink)]">
              {klass.label || `${klass.grade} · ${klass.section}`}
            </span>
            <ClsSubjectBadge label={staff.subjectName} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <StaffDetailSection
          title="Teacher identity"
          description="Identifiers used in academic records and payroll."
        >
          <StaffDetailFields items={identityFields} />
        </StaffDetailSection>

        <StaffDetailSection
          title="Current teaching load"
          description="Active subject and class sections from the teacher profile."
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
              <p className="mb-2 text-xs font-medium text-[var(--cls-muted)]">
                Class sections ({staff.classLabels.length})
              </p>
              {staff.classLabels.length === 0 ? (
                <p className="text-sm text-[var(--cls-muted)]">None yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {staff.classLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-2 py-0.5 text-xs font-medium"
                    >
                      {shortenClassLabel(label)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              asChild
            >
              <Link to={timetableHref}>Open timetable</Link>
            </Button>
          </div>
        </StaffDetailSection>
      </div>

      {canChangeSubject ? (
        <StaffDetailSection
          title="Change assigned subject"
          description="Updates the teacher's primary subject for new marks, lessons, and timetable defaults."
        >
          <StaffDetailSubjectTab
            staff={staff}
            subjects={subjects}
            saving={saving}
            onSave={onSubjectSave}
          />
        </StaffDetailSection>
      ) : (
        <StaffDetailSection
          title="Assigned subject"
          description="You do not have permission to change teacher subjects."
        >
          <ClsSubjectBadge label={staff.subjectName} />
        </StaffDetailSection>
      )}

      <StaffDetailSection
        title="Class profile"
        description="Classes associated with this teacher record."
      >
        {classList}
      </StaffDetailSection>

      <StaffDetailSection
        title="Subject assignment history"
        description="Past and current subject assignments (audit trail)."
      >
        {historyBody}
      </StaffDetailSection>

      <StaffDetailSection
        title="Timetable assignments"
        description="Weekly period assignments are managed on the school timetable."
      >
        <StaffDetailAssignmentsTab staff={staff} timetableHref={timetableHref} />
      </StaffDetailSection>
    </div>
  )
}
