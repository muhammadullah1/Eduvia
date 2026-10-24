import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import attendanceReviewService, { ATTENDANCE_REVIEW_KEY } from "@/api/attendance/attendance-review.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { getToday } from "@/lib/dates"
import { formatLongDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { guardianLine, STATUS_LABELS, STATUS_TONES } from "./attendance-rules"
import { ClassSelect, Counts, FilterField, LoadError, LoadingRows } from "./attendance-shared"

type Props = { date: string; onDateChange: (value: string) => void }

/** Absentee List: every absent or late student on a day, across all classes. */
export function AbsenteePanel({ date, onDateChange }: Props) {
  const actor = useActor()
  const navigate = useNavigate()
  const [classId, setClassId] = useState("")
  const query = useQuery({
    queryKey: [ATTENDANCE_REVIEW_KEY, "absentees", date, classId],
    enabled: Boolean(date),
    placeholderData: keepPreviousData,
    queryFn: () => attendanceReviewService.absentees(date, classId ? Number(classId) : undefined),
  })
  const data = query.data

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,220px)]">
        <FilterField id="absentee-date" label="Date">
          <DatePicker id="absentee-date" value={date} onChange={onDateChange} maxDate={getToday()} defaultMonthKind="today" aria-label="Date" />
        </FilterField>
        <FilterField id="absentee-class" label="Class">
          <ClassSelect id="absentee-class" value={classId} onChange={setClassId} allowAll />
        </FilterField>
      </div>
      <ClsPanel>
        <ClsPanelHeader
          title={`Absentees & late arrivals · ${formatLongDate(date)}`}
          description={classId ? undefined : "All classes"}
          actions={
            data ? (
              <Counts
                items={[
                  { label: "Absent", value: data.absent, className: "text-red-600" },
                  { label: "Late", value: data.late, className: "text-amber-700" },
                ]}
              />
            ) : null
          }
        />
        {query.isError ? (
          <LoadError what="absentees" onRetry={() => void query.refetch()} />
        ) : query.isLoading || !data ? (
          <LoadingRows label="Loading absentees" />
        ) : !data.students.length ? (
          <ClsEmpty title="Everyone was in class">No student was marked absent or late on {formatLongDate(date)}.</ClsEmpty>
        ) : (
          <Table className={cn("table-fixed", query.isFetching && "opacity-70")}>
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh className="w-[22%]">Student</ClsTh>
                <ClsTh className="w-[15%]">Adm. no.</ClsTh>
                <ClsTh className="w-[13%]">Class</ClsTh>
                <ClsTh className="w-[12%]">Status</ClsTh>
                <ClsTh>Guardian contact</ClsTh>
                <ClsTh className="w-[110px] text-right">
                  <span className="sr-only">Profile</span>
                </ClsTh>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.students.map((s) => (
                <TableRow key={s.attendanceId} className={clsRowClass}>
                  <TableCell className="truncate text-sm font-medium text-[var(--cls-ink)]">{s.name}</TableCell>
                  <TableCell className="truncate font-mono text-xs text-[var(--cls-muted)]">{s.admissionNo}</TableCell>
                  <TableCell className="truncate text-sm text-[var(--cls-ink)]">{s.classLabel}</TableCell>
                  <TableCell>
                    <StatusChip tone={STATUS_TONES[s.status]} showDot>
                      {STATUS_LABELS[s.status]}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="truncate text-sm text-[var(--cls-muted)]" title={guardianLine(s.guardian)}>
                    {guardianLine(s.guardian)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[var(--cls-brand)]"
                      onClick={() => navigate(portalPath(actor.role, "students", String(s.studentId)))}
                    >
                      View profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ClsPanel>
    </div>
  )
}
