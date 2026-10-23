import { keepPreviousData, useQuery } from "@tanstack/react-query"

import attendanceReviewService, { ATTENDANCE_REVIEW_KEY } from "@/api/attendance/attendance-review.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { MonthPicker } from "@/components/ui/month-picker"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { FILTER_TRIGGER_CLASS, monthLabel, percentLabel } from "./attendance-rules"
import { ClassSelect, FilterField, LoadError, LoadingRows, PercentBar } from "./attendance-shared"

type Props = {
  classId: string
  month: string
  onClassChange: (value: string) => void
  onMonthChange: (value: string) => void
}

const num = "text-sm tabular-nums"

/** Monthly Report: per-student counts and attendance % for a class and month. */
export function MonthlyPanel({ classId, month, onClassChange, onMonthChange }: Props) {
  const query = useQuery({
    queryKey: [ATTENDANCE_REVIEW_KEY, "monthly", classId, month],
    enabled: Boolean(classId && month),
    placeholderData: keepPreviousData,
    queryFn: () => attendanceReviewService.monthly(Number(classId), month),
  })
  const data = query.data

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,200px)]">
        <FilterField id="monthly-class" label="Class">
          <ClassSelect id="monthly-class" value={classId} onChange={onClassChange} />
        </FilterField>
        <FilterField id="monthly-month" label="Month">
          <MonthPicker id="monthly-month" value={month} onChange={onMonthChange} monthsAhead={0} aria-label="Month" className={FILTER_TRIGGER_CLASS} />
        </FilterField>
      </div>
      <ClsPanel>
        {!classId ? (
          <ClsEmpty title="Choose a class">Pick a class and a month to see attendance percentages.</ClsEmpty>
        ) : query.isError ? (
          <LoadError what="the monthly report" onRetry={() => void query.refetch()} />
        ) : query.isLoading || !data ? (
          <LoadingRows label="Loading monthly report" />
        ) : (
          <>
            <ClsPanelHeader
              title={`${data.classLabel} · ${monthLabel(data.month)} · ${data.workingDays} working day${data.workingDays === 1 ? "" : "s"}`}
              description={`Working days are days the register was taken. Present and late count as attended; rows below ${data.threshold}% are highlighted.`}
              actions={
                data.classPercent !== null ? (
                  <span className="text-xs font-medium text-[var(--cls-muted)]">
                    Class attendance <span className="text-sm font-semibold text-[var(--cls-ink)]">{percentLabel(data.classPercent)}</span>
                  </span>
                ) : null
              }
            />
            {!data.workingDays ? (
              <ClsEmpty title="No attendance this month">No register was taken for {data.classLabel} in {monthLabel(data.month)}.</ClsEmpty>
            ) : (
              <Table className={cn("table-fixed", query.isFetching && "opacity-70")}>
                <TableHeader>
                  <TableRow className={clsHeadRowClass}>
                    <ClsTh className="w-[22%]">Student</ClsTh>
                    <ClsTh className="w-[15%]">Adm. no.</ClsTh>
                    <ClsTh className="w-[9%]">Present</ClsTh>
                    <ClsTh className="w-[9%]">Absent</ClsTh>
                    <ClsTh className="w-[8%]">Late</ClsTh>
                    <ClsTh className="w-[9%]">Leave</ClsTh>
                    <ClsTh className="w-[10%]">Marked</ClsTh>
                    <ClsTh>Attendance</ClsTh>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((s) => (
                    <TableRow key={s.studentId} className={cn(clsRowClass, s.low && "bg-red-50/60 hover:bg-red-50")}>
                      <TableCell className="truncate text-sm font-medium text-[var(--cls-ink)]">{s.name}</TableCell>
                      <TableCell className="truncate font-mono text-xs text-[var(--cls-muted)]">{s.admissionNo}</TableCell>
                      <TableCell className={num}>{s.present}</TableCell>
                      <TableCell className={cn(num, s.absent ? "text-red-600" : "text-[var(--cls-muted)]")}>{s.absent}</TableCell>
                      <TableCell className={cn(num, s.late ? "text-amber-700" : "text-[var(--cls-muted)]")}>{s.late}</TableCell>
                      <TableCell className={cn(num, s.leave ? "text-[var(--cls-brand)]" : "text-[var(--cls-muted)]")}>{s.leave}</TableCell>
                      <TableCell className={cn(num, "text-[var(--cls-muted)]")}>
                        {s.marked}/{data.workingDays}
                      </TableCell>
                      <TableCell>
                        <PercentBar value={s.percent} threshold={data.threshold} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </ClsPanel>
    </div>
  )
}
