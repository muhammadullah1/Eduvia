import { CheckCircle2, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ClassSection, Substitution, TeacherAbsence } from "@/data/types"
import { StaffAvatar } from "@/features/management/teachers-assignments/staff-avatar"
import { weekdayOf } from "@/lib/academics"
import { classLabel, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { SubstituteTeacherOption } from "./hooks/use-teachers-list"
import { SubstitutePeriodChips } from "./substitute-period-chips"

type Props = {
  viewDate: string
  classes: ClassSection[]
  teachers: SubstituteTeacherOption[]
  grouped: Map<string, TeacherAbsence[]>
  substitutions: Substitution[]
  teacherNameById: (id: string) => string
  onAssignTeacher: (teacherId: string) => void
  onAssignOne: (absenceId: string, substituteId: string) => void
  onRemoveCover: (absenceId: string) => void
  onCancelAbsence: (absenceId: string) => void
}

function statusBadge(status: TeacherAbsence["status"], hasSub: boolean) {
  if (status === "Covered" || hasSub) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
        <CheckCircle2 className="size-3" aria-hidden />
        Covered
      </span>
    )
  }
  if (status === "Pending") {
    return (
      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
        Needs cover
      </span>
    )
  }
  if (status === "NoClass") {
    return (
      <span className="rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--cls-muted)]">
        No class
      </span>
    )
  }
  return null
}

export function SubstitutesDayBoard({
  viewDate,
  classes,
  teachers,
  grouped,
  substitutions,
  teacherNameById,
  onAssignTeacher,
  onAssignOne,
  onRemoveCover,
  onCancelAbsence,
}: Props) {
  const entries = Array.from(grouped.entries())

  if (entries.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {entries.map(([tid, rows]) => {
        const person = teachers.find((s) => s.id === tid)
        const pendingForTeacher = rows.filter((r) => r.status === "Pending").length
        const allCovered = pendingForTeacher === 0

        return (
          <section
            key={tid}
            className="min-w-0 overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
          >
            <header
              className={cn(
                "flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:px-5",
                allCovered
                  ? "bg-emerald-50/40"
                  : "bg-[var(--page-wash)]/50"
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <StaffAvatar name={teacherNameById(tid)} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--cls-ink)]">
                    {teacherNameById(tid)}
                  </p>
                  <p className="text-xs text-[var(--cls-muted)]">
                    {person?.subject ? `${person.subject} · ` : ""}
                    Absent {formatDate(viewDate)} · {rows.length}{" "}
                    {rows.length === 1 ? "period" : "periods"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {allCovered ? (
                  <span className="text-xs font-medium text-emerald-800">
                    All periods covered
                  </span>
                ) : (
                  <>
                    <span className="rounded-md border border-red-200/90 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                      {pendingForTeacher} unassigned
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                      onClick={() => onAssignTeacher(tid)}
                    >
                      Assign all
                    </Button>
                  </>
                )}
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--cls-border)] bg-[var(--page-wash)]/30 text-[11px] font-semibold uppercase tracking-wide text-[var(--cls-muted)]">
                    <th className="w-24 px-4 py-2.5 sm:px-5">Period</th>
                    <th className="min-w-[140px] px-3 py-2.5">Class & subject</th>
                    <th className="min-w-[200px] px-3 py-2.5">Substitute</th>
                    <th className="w-28 px-3 py-2.5">Status</th>
                    <th className="w-12 px-3 py-2.5 text-right sm:px-5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const sub = substitutions.find(
                      (item) => item.absenceId === row.id
                    )
                    const classLine = row.classId
                      ? `${classLabel(classes, row.classId)} · ${row.subject ?? ""}`
                      : "Free period"
                    const isLast = index === rows.length - 1

                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "align-top",
                          !isLast && "border-b border-[var(--cls-border)]"
                        )}
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <p className="font-semibold tabular-nums text-[var(--cls-ink)]">
                            P{row.periodIndex}
                          </p>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--cls-muted)]">
                            {weekdayOf(row.date)}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-[var(--cls-ink)]">
                          <p className="font-medium leading-snug">{classLine}</p>
                        </td>
                        <td className="px-3 py-3">
                          {sub ? (
                            <div className="flex items-center gap-2">
                              <StaffAvatar
                                name={teacherNameById(sub.substituteTeacherId)}
                                className="size-8 text-xs"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-emerald-900">
                                  {teacherNameById(sub.substituteTeacherId)}
                                </p>
                                {sub.authorizedBy ? (
                                  <p className="truncate text-[11px] text-[var(--cls-muted)]">
                                    by {sub.authorizedBy}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : row.status === "Pending" ? (
                            <SubstitutePeriodChips
                              absence={row}
                              compact
                              onPick={(id) => onAssignOne(row.id, id)}
                            />
                          ) : (
                            <span className="text-xs text-[var(--cls-muted)]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {statusBadge(row.status, Boolean(sub))}
                        </td>
                        <td className="px-3 py-3 text-right sm:px-5">
                          {row.status !== "Cancelled" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-[var(--cls-muted)]"
                                  aria-label="Period actions"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {sub || row.status === "Covered" ? (
                                  <DropdownMenuItem
                                    onClick={() => onRemoveCover(row.id)}
                                  >
                                    Remove cover
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => onCancelAbsence(row.id)}
                                >
                                  Cancel absence
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
