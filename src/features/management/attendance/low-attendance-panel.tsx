import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import attendanceReviewService, { ATTENDANCE_REVIEW_KEY } from "@/api/attendance/attendance-review.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { cn } from "@/lib/utils"

import { FILTER_TRIGGER_CLASS, guardianLine, monthLabel, THRESHOLDS } from "./attendance-rules"
import { ClassSelect, FilterField, LoadError, LoadingRows, PercentBar } from "./attendance-shared"

type Props = { month: string; onMonthChange: (value: string) => void }

/** Low Attendance: students below the threshold in a month, with guardian contact. */
export function LowAttendancePanel({ month, onMonthChange }: Props) {
  const actor = useActor()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [classId, setClassId] = useState("")
  const [threshold, setThreshold] = useState<number | null>(null)
  const query = useQuery({
    queryKey: [ATTENDANCE_REVIEW_KEY, "low", month, classId, threshold],
    placeholderData: keepPreviousData,
    queryFn: () => attendanceReviewService.low(month, threshold ?? undefined, classId ? Number(classId) : undefined),
  })
  const data = query.data
  const active = threshold ?? data?.threshold ?? 75
  const canSaveDefault = can(actor.role, "settings.academic") && data != null && active !== data.defaultThreshold
  const saveDefault = useMutation({
    mutationFn: () => attendanceReviewService.saveThreshold(active),
    onSuccess: async () => {
      toast.success(`Low attendance threshold set to ${active}%`, { description: "Reports and the monthly view now use it by default." })
      setThreshold(null)
      await queryClient.invalidateQueries({ queryKey: [ATTENDANCE_REVIEW_KEY] })
    },
    onError: (error) => toast.error("Threshold not saved", { description: error instanceof Error ? error.message : undefined }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,220px)_minmax(0,220px)_auto]">
        <FilterField id="low-month" label="Month">
          <MonthPicker id="low-month" value={month} onChange={onMonthChange} monthsAhead={0} aria-label="Month" className={FILTER_TRIGGER_CLASS} />
        </FilterField>
        <FilterField id="low-class" label="Class">
          <ClassSelect id="low-class" value={classId} onChange={setClassId} allowAll />
        </FilterField>
        <FilterField id="low-threshold" label="Threshold">
          <Select value={String(active)} onValueChange={(value) => setThreshold(Number(value))}>
            <SelectTrigger id="low-threshold" className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...new Set([...THRESHOLDS, active])].sort((a, b) => a - b).map((value) => (
                <SelectItem key={value} value={String(value)}>
                  Below {value}%{value === data?.defaultThreshold ? " (school default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        {canSaveDefault ? (
          <Button variant="outline" className="justify-self-start" disabled={saveDefault.isPending} onClick={() => saveDefault.mutate()}>
            Make {active}% the default
          </Button>
        ) : null}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Students below <span className="font-semibold">{active}% attendance</span> are listed. Contact their guardians and follow up.
        </p>
      </div>
      <ClsPanel>
        <ClsPanelHeader
          title={`Low attendance · below ${active}% · ${monthLabel(month)}`}
          description="Present and late count as attended, out of the days each student was marked."
          actions={data ? <span className="text-xs font-medium text-[var(--cls-muted)]">{data.students.length} students</span> : null}
        />
        {query.isError ? (
          <LoadError what="low attendance" onRetry={() => void query.refetch()} />
        ) : query.isLoading || !data ? (
          <LoadingRows label="Loading low attendance" />
        ) : !data.students.length ? (
          <ClsEmpty title="No students below the threshold">
            Nobody fell below {active}% in {monthLabel(month)}
            {classId ? " for this class" : ""}.
          </ClsEmpty>
        ) : (
          <Table className={cn("table-fixed", query.isFetching && "opacity-70")}>
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh className="w-[19%]">Student</ClsTh>
                <ClsTh className="w-[11%]">Class</ClsTh>
                <ClsTh className="w-[9%]">Attended</ClsTh>
                <ClsTh className="w-[9%]">Absent</ClsTh>
                <ClsTh className="w-[15%]">Attendance</ClsTh>
                <ClsTh>Guardian contact</ClsTh>
                <ClsTh className="w-[110px] text-right">
                  <span className="sr-only">Profile</span>
                </ClsTh>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.students.map((s) => (
                <TableRow key={`${s.studentId}-${s.classId}`} className={cn(clsRowClass, "bg-red-50/50 hover:bg-red-50")}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-[var(--cls-ink)]">{s.name}</span>
                      <span className="truncate font-mono text-[11px] text-[var(--cls-muted)]">{s.admissionNo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-sm text-[var(--cls-ink)]">{s.classLabel}</TableCell>
                  <TableCell className="text-sm tabular-nums">{s.present + s.late}</TableCell>
                  <TableCell className="text-sm text-red-600 tabular-nums">{s.absent}</TableCell>
                  <TableCell>
                    <PercentBar value={s.percent} threshold={data.threshold} />
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
