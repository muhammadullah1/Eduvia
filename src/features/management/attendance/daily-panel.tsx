import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { Info, Pencil, Plus } from "lucide-react"
import { useState } from "react"

import attendanceReviewService, { ATTENDANCE_REVIEW_KEY, type DailyStudent } from "@/api/attendance/attendance-review.service"
import { ClsActionCell, ClsActionTh, ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { getToday } from "@/lib/dates"
import { formatDate, formatLongDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { editWindowText, STATUS_LABELS, STATUS_TONES } from "./attendance-rules"
import { ClassSelect, Counts, FilterField, LoadError, LoadingRows } from "./attendance-shared"
import { EditAttendanceDialog } from "./edit-attendance-dialog"

type Props = {
  classId: string
  date: string
  onClassChange: (value: string) => void
  onDateChange: (value: string) => void
}

/** Daily Report: one class on one day, with audited edits inside the edit window. */
export function DailyPanel({ classId, date, onClassChange, onDateChange }: Props) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<DailyStudent | null>(null)
  const query = useQuery({
    queryKey: [ATTENDANCE_REVIEW_KEY, "daily", classId, date],
    enabled: Boolean(classId && date),
    placeholderData: keepPreviousData,
    queryFn: () => attendanceReviewService.daily(Number(classId), date),
  })
  const data = query.data
  const refresh = () => queryClient.invalidateQueries({ queryKey: [ATTENDANCE_REVIEW_KEY] })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,200px)]">
        <FilterField id="daily-class" label="Class">
          <ClassSelect id="daily-class" value={classId} onChange={onClassChange} />
        </FilterField>
        <FilterField id="daily-date" label="Date">
          <DatePicker id="daily-date" value={date} onChange={onDateChange} maxDate={getToday()} defaultMonthKind="today" aria-label="Date" />
        </FilterField>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Management can change or add attendance {editWindowText(data?.editWindowDays ?? 7)}
          {data?.windowBypass ? " (Super Admin can also correct older days)" : ""}. Every change is written to the change history with
          the reason, who made it and when.
        </p>
      </div>
      <ClsPanel>
        {!classId ? (
          <ClsEmpty title="Choose a class">Pick a class and a date to see each student's attendance.</ClsEmpty>
        ) : query.isError ? (
          <LoadError what="the daily report" onRetry={() => void query.refetch()} />
        ) : query.isLoading || !data ? (
          <LoadingRows label="Loading daily report" />
        ) : (
          <>
            <ClsPanelHeader
              title={`${data.classLabel} · ${formatLongDate(data.date)}`}
              description={
                !data.taken && data.canEdit
                  ? "The teacher has not taken this register. You can mark students individually with a reason."
                  : !data.canEdit
                  ? "The edit window for this day has closed. Records are read-only."
                  : data.windowBypass && data.editableUntil < getToday()
                    ? "Outside the normal edit window. As Super Admin you can still correct it; a reason is required."
                    : `Editable until ${formatDate(data.editableUntil)}.`
              }
              actions={
                data.taken ? (
                  <Counts
                    items={[
                      { label: "Present", value: data.summary.present, className: "text-emerald-700" },
                      { label: "Absent", value: data.summary.absent, className: "text-red-600" },
                      { label: "Late", value: data.summary.late, className: "text-amber-700" },
                      { label: "On leave", value: data.summary.leave, className: "text-[var(--cls-brand)]" },
                      ...(data.summary.unmarked ? [{ label: "Not marked", value: data.summary.unmarked, className: "text-[var(--cls-muted)]" }] : []),
                    ]}
                  />
                ) : null
              }
            />
            {!data.taken && !data.canEdit ? (
              <ClsEmpty title="Attendance not taken">
                The teacher has not recorded attendance for {data.classLabel} on {formatDate(data.date)} yet.
              </ClsEmpty>
            ) : (
              <Table className={cn("table-fixed", query.isFetching && "opacity-70")}>
                <TableHeader>
                  <TableRow className={clsHeadRowClass}>
                    <ClsTh>Student</ClsTh>
                    <ClsTh className="w-[22%]">Adm. no.</ClsTh>
                    <ClsTh className="w-[24%]">Status</ClsTh>
                    <ClsActionTh className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((student) => (
                    <TableRow key={student.studentId} className={clsRowClass}>
                      <TableCell className="truncate text-sm font-medium text-[var(--cls-ink)]">{student.name}</TableCell>
                      <TableCell className="truncate font-mono text-xs text-[var(--cls-muted)]">{student.admissionNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {student.status ? (
                            <StatusChip tone={STATUS_TONES[student.status]} showDot>
                              {STATUS_LABELS[student.status]}
                            </StatusChip>
                          ) : (
                            <StatusChip>Not marked</StatusChip>
                          )}
                          {student.changes ? (
                            <span className="text-[11px] text-[var(--cls-muted)]" title="This mark has been changed">
                              Edited
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <ClsActionCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={!data.canEdit}
                          title={!data.canEdit ? "Outside the edit window" : undefined}
                          onClick={() => setEditing(student)}
                          aria-label={`${student.attendanceId ? "Edit" : "Mark"} attendance for ${student.name}`}
                        >
                          {student.attendanceId ? <Pencil data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                          {student.attendanceId ? "Edit" : "Mark"}
                        </Button>
                      </ClsActionCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </ClsPanel>
      <EditAttendanceDialog student={editing} classId={Number(classId)} date={date} onOpenChange={(open) => !open && setEditing(null)} onSaved={() => void refresh()} />
    </div>
  )
}
