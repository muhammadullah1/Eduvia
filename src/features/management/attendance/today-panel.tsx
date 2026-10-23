import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellRing, Check, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import attendanceReviewService, { ATTENDANCE_REVIEW_KEY, type TodayClass } from "@/api/attendance/attendance-review.service"
import { ClsActionCell, ClsActionTh, ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { formatLongDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { timeOf } from "./attendance-rules"
import { LoadError, LoadingRows } from "./attendance-shared"

/** Who is responsible today: the Super Master, or the substitute covering them. */
function ResponsibleCell({ row }: { row: TodayClass }) {
  if (row.superMasterState === "unassigned") {
    return <StatusChip tone="warning">No Super Master assigned</StatusChip>
  }
  if (row.superMasterState === "inactive") {
    return <StatusChip tone="danger">Super Master inactive</StatusChip>
  }
  if (row.superMasterAbsent && row.substitutes.length) {
    return (
      <span className="block min-w-0">
        <span className="block truncate text-sm text-[var(--cls-ink)]">{row.substitutes.join(", ")}</span>
        <span className="block truncate text-xs text-[var(--cls-muted)]">Covering {row.superMaster} (absent)</span>
      </span>
    )
  }
  return (
    <span className="block min-w-0">
      <span className="block truncate text-sm text-[var(--cls-ink)]">{row.superMaster}</span>
      {row.superMasterAbsent ? <span className="block truncate text-xs text-amber-700">Absent today · no substitute assigned</span> : null}
    </span>
  )
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "taken" | "pending" | "total" }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        tone === "taken" && "border-emerald-200 bg-emerald-50/70",
        tone === "pending" && "border-amber-200 bg-amber-50/70",
        tone === "total" && "border-[var(--cls-border)] bg-white"
      )}
    >
      <p
        className={cn(
          "text-xs font-medium",
          tone === "taken" ? "text-emerald-800" : tone === "pending" ? "text-amber-800" : "text-[var(--cls-muted)]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "taken" ? "text-emerald-800" : tone === "pending" ? "text-amber-700" : "text-[var(--cls-ink)]"
        )}
      >
        {value}
      </p>
    </div>
  )
}

/** Today's Status: which active classes have attendance and which are still waiting. */
export function TodayPanel({ onAssign }: { onAssign: () => void }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: [ATTENDANCE_REVIEW_KEY, "today"], queryFn: () => attendanceReviewService.today() })
  const remind = useMutation({
    mutationFn: (row: TodayClass) => attendanceReviewService.remind(row.classId),
    onSuccess: async (data, row) => {
      toast.success(`Reminder sent to ${data.teacher}`, {
        description: data.viaSubstitute
          ? `${data.teacher} is covering ${data.superMaster} in ${row.classLabel} today. It shows in their notifications and on their Today page.`
          : `It shows in their notifications and on their Today page for ${row.classLabel}.`,
      })
      await queryClient.invalidateQueries({ queryKey: [ATTENDANCE_REVIEW_KEY, "today"] })
    },
    onError: (error) => toast.error("Reminder not sent", { description: error instanceof Error ? error.message : undefined }),
  })
  const data = query.data
  const unassigned = data?.classes.filter((row) => row.superMasterState !== "assigned").length ?? 0

  return (
    <div className="flex flex-col gap-4">
      {unassigned ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
            <p className="text-sm text-amber-900">
              <span className="font-medium">
                {unassigned} active class{unassigned === 1 ? " has" : "es have"} no active Super Master.
              </span>{" "}
              Teachers can't take attendance there and reminders can't be sent until one is assigned.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 border-amber-300 bg-white" onClick={onAssign}>
            Assign Super Masters
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Attendance taken" value={data?.taken ?? 0} tone="taken" />
        <StatTile label="Pending" value={data?.pending ?? 0} tone="pending" />
        <StatTile label="Total classes" value={data?.total ?? 0} tone="total" />
      </div>
      <ClsPanel>
        <ClsPanelHeader
          title={data ? formatLongDate(data.date) : "Today"}
          description="Active classes and whether their Super Master (or today's substitute) has taken the register."
        />
        {query.isError ? (
          <LoadError what="today's attendance" onRetry={() => void query.refetch()} />
        ) : query.isLoading ? (
          <LoadingRows label="Loading today's attendance" />
        ) : !data?.classes.length ? (
          <ClsEmpty title="No active classes">Classes become active once students are enrolled.</ClsEmpty>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh className="w-[18%]">Class</ClsTh>
                <ClsTh>Responsible teacher</ClsTh>
                <ClsTh className="w-[120px]">Status</ClsTh>
                <ClsTh className="w-[110px]">Time</ClsTh>
                <ClsTh className="w-[100px]">Present</ClsTh>
                <ClsTh className="w-[100px]">Absent</ClsTh>
                <ClsActionTh className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.classes.map((row) => (
                <TableRow key={row.classId} className={cn(clsRowClass, !row.taken && "bg-amber-50/50 hover:bg-amber-50")}>
                  <TableCell className="truncate text-sm font-medium text-[var(--cls-ink)]">{row.classLabel}</TableCell>
                  <TableCell className="min-w-0">
                    <ResponsibleCell row={row} />
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={row.taken ? "success" : "warning"} showDot>
                      {row.taken ? "Taken" : "Pending"}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--cls-muted)] tabular-nums">{timeOf(row.takenAt)}</TableCell>
                  <TableCell className="text-sm font-medium text-emerald-700 tabular-nums">
                    {row.taken ? `${row.present}/${row.students}` : "—"}
                  </TableCell>
                  <TableCell className={cn("text-sm font-medium tabular-nums", row.absent ? "text-red-600" : "text-[var(--cls-muted)]")}>
                    {row.taken ? row.absent : "—"}
                  </TableCell>
                  <ClsActionCell>
                    {row.taken ? null : row.superMasterState !== "assigned" ? (
                      <Button variant="ghost" size="sm" className="-ml-2 h-7 text-[var(--cls-brand)]" onClick={onAssign}>
                        Assign Super Master
                      </Button>
                    ) : row.remindedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--cls-muted)]">
                        <Check className="size-3.5 text-emerald-600" aria-hidden />
                        Reminded {timeOf(row.remindedAt)}
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-7 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                        disabled={remind.isPending}
                        onClick={() => remind.mutate(row)}
                      >
                        <BellRing data-icon="inline-start" />
                        Send reminder
                      </Button>
                    )}
                  </ClsActionCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ClsPanel>
    </div>
  )
}
