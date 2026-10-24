import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowUpRight, RefreshCcw } from "lucide-react"
import { type ReactNode, useState } from "react"

import lifecycleService, { LIFECYCLE_QUERY_KEY, type LifecycleEvent } from "@/api/students/lifecycle.service"
import studentsService from "@/api/students/students.service"
import { ClsPanel, ClsPanelHeader, ClsStatCard } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { useActor } from "@/lib/actor"
import type { ApiStudentParent } from "@/lib/api-types"
import { formatDate } from "@/lib/format"
import { can } from "@/lib/permissions"

import { ChangeStatusDialog, PromoteDialog } from "../lifecycle"
import { EVENT_LABELS, EVENT_TONES, eventDetail } from "../lifecycle/lifecycle-rules"
import { StudentStatusChip } from "./student-status-chip"

type Props = {
  studentId: string
  onBack: () => void
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--cls-muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[var(--cls-ink)]">{value || "—"}</dd>
    </div>
  )
}

function guardianName(parent: ApiStudentParent) {
  const userName = parent.user ? `${parent.user.firstName} ${parent.user.lastName}`.trim() : ""
  return parent.guardianName || userName || parent.fatherName || parent.motherName || "—"
}

/** Student profile, opened from the students list. Managers can change status or promote from here. */
export function StudentDetailPage({ studentId, onBack }: Props) {
  const id = Number(studentId)
  const actor = useActor()
  const canManage = can(actor.role, "students.manage")
  const [dialog, setDialog] = useState<"status" | "promote" | null>(null)
  const { data: student, isLoading, isError, refetch } = useQuery({
    queryKey: ["students", "detail", id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: () => studentsService.get(id),
  })
  const lifecycleQuery = useQuery({
    queryKey: [LIFECYCLE_QUERY_KEY, id],
    enabled: canManage && Number.isFinite(id) && id > 0,
    queryFn: () => lifecycleService.timeline(id),
  })

  const back = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-10 shrink-0 rounded-[10px] border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-ink)] shadow-none hover:bg-[var(--cls-border)]/40"
      onClick={onBack}
      aria-label="Back to students"
    >
      <ArrowLeft className="size-5" />
    </Button>
  )

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-[var(--cls-muted)]">Loading student…</p>
  }
  if (isError || !student) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-base font-medium text-[var(--cls-ink)]">Student not found</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back to students
          </Button>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const name = `${student.firstName} ${student.lastName}`.trim()
  const parents = student.parents ?? []
  const lifecycleStudent = {
    id: student.id,
    name,
    admissionNo: student.admissionNo,
    status: student.status,
    classLabel: student.class?.label ?? null,
    classId: student.fkClassId,
    admittedOn: student.admissionDate ?? student.admittedOn ?? null,
  }
  const timeline: LifecycleEvent[] = [...(lifecycleQuery.data?.events ?? [])].reverse()
  const history = [
    ...(student.statusEvents ?? []).map((event) => ({
      key: `s${event.id}`,
      date: event.effectiveOn,
      text: `Status ${event.fromStatus} → ${event.toStatus}`,
      note: event.reason,
    })),
    ...(student.promotions ?? []).map((item) => ({
      key: `p${item.id}`,
      date: item.promotedOn,
      text: `Promoted ${item.fromClass?.label ?? "—"} → ${item.toClass?.label ?? "—"}`,
      note: "",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 items-center gap-3">
        {back}
        {student.photo ? (
          <img src={student.photo} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--cls-brand)]/10 text-sm font-semibold text-[var(--cls-brand)]">
            {initials(student.firstName, student.lastName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[var(--cls-muted)] uppercase">
            Student profile
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">{name}</h1>
            <StudentStatusChip status={student.status} />
          </div>
          <p className="font-mono text-xs text-[var(--cls-muted)]">{student.admissionNo}</p>
        </div>
        {canManage ? (
          <div className="ml-auto flex shrink-0 gap-2">
            {student.status === "Active" ? (
              <Button variant="outline" onClick={() => setDialog("promote")}>
                <ArrowUpRight data-icon="inline-start" />
                Promote
              </Button>
            ) : null}
            <Button onClick={() => setDialog("status")}>
              <RefreshCcw data-icon="inline-start" />
              Change status
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ClsStatCard label="Class" value={student.class?.label ?? "—"} />
        <ClsStatCard
          label="Admitted on"
          value={student.admissionDate ? formatDate(student.admissionDate) : "—"}
        />
        <ClsStatCard label="Fee discount" value={`${Number(student.discountPercent ?? 0)}%`} />
        <ClsStatCard label="Guardians" value={parents.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClsPanel>
          <ClsPanelHeader title="Personal details" />
          <dl className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <Item label="Full name" value={name} />
            <Item label="Gender" value={student.gender} />
            <Item label="Date of birth" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : ""} />
            <Item label="Blood group" value={student.bloodGroup} />
            <Item label="Emergency contact" value={student.emergencyContact} />
            <Item label="Address" value={student.address} />
          </dl>
        </ClsPanel>

        <ClsPanel>
          <ClsPanelHeader title="Guardians" />
          {parents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">No guardian linked.</p>
          ) : (
            <ul className="divide-y divide-[var(--cls-border)]">
              {parents.map((parent) => {
                const phone = parent.primaryContactNumber || parent.user?.phone
                return (
                  <li key={parent.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--cls-ink)]">{guardianName(parent)}</p>
                      <p className="text-xs text-[var(--cls-muted)]">
                        {parent.student_parents?.relationshipType ?? "Guardian"}
                        {parent.user?.email ? ` · ${parent.user.email}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {parent.student_parents?.isPrimary ? (
                        <span className="text-[11px] font-medium text-[var(--cls-brand)]">Primary</span>
                      ) : null}
                      {phone ? (
                        <a className="text-sm text-[var(--cls-brand)]" href={`tel:${phone}`}>
                          {phone}
                        </a>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </ClsPanel>
      </div>

      <ClsPanel>
        <ClsPanelHeader title="History" description="Enrollment, promotions and status changes, newest first" />
        {canManage && lifecycleQuery.data ? (
          timeline.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">No changes recorded yet.</p>
          ) : (
            <ol className="divide-y divide-[var(--cls-border)]">
              {timeline.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip tone={EVENT_TONES[event.type] ?? "neutral"} showDot>
                        {EVENT_LABELS[event.type] ?? event.type}
                      </StatusChip>
                      <span className="font-medium text-[var(--cls-ink)]">{eventDetail(event)}</span>
                    </div>
                    {event.reason ? <p className="text-xs text-[var(--cls-muted)]">{event.reason}</p> : null}
                    {event.academicStatus ? (
                      <p className="text-xs text-[var(--cls-muted)]">Academic status: {event.academicStatus}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-[var(--cls-muted)]">
                    <span>{formatDate(event.date)}</span>
                    {event.recordedBy ? <span>{event.recordedBy}</span> : null}
                  </div>
                </li>
              ))}
            </ol>
          )
        ) : history.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">No changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--cls-border)]">
            {history.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--cls-ink)]">{item.text}</p>
                  {item.note ? <p className="text-xs text-[var(--cls-muted)]">{item.note}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-[var(--cls-muted)]">{formatDate(item.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </ClsPanel>
      <ChangeStatusDialog
        student={dialog === "status" ? lifecycleStudent : null}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <PromoteDialog
        student={dialog === "promote" ? lifecycleStudent : null}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </div>
  )
}
