import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import attendanceReviewService, {
  ATTENDANCE_REVIEW_KEY,
  type SuperMasterClass,
  type SuperMasterState,
} from "@/api/attendance/attendance-review.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { StatusChip, type StatusChipTone } from "@/components/app/status-chip"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { FILTER_TRIGGER_CLASS } from "./attendance-rules"
import { LoadError, LoadingRows } from "./attendance-shared"

const SUPER_MASTERS_KEY = [ATTENDANCE_REVIEW_KEY, "super-masters"]
const NONE = "none"

const STATE_CHIP: Record<SuperMasterState, { tone: StatusChipTone; label: string }> = {
  assigned: { tone: "success", label: "Assigned" },
  unassigned: { tone: "warning", label: "Not assigned" },
  inactive: { tone: "danger", label: "Teacher inactive" },
}

/**
 * Super Masters: the one teacher per class who takes its attendance for the whole school
 * day. Only they (or the substitute covering them on a day they are absent) can mark it.
 */
export function SuperMasterPanel() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: SUPER_MASTERS_KEY, queryFn: attendanceReviewService.superMasters })
  const save = useMutation({
    mutationFn: ({ row, teacherId }: { row: SuperMasterClass; teacherId: number | null }) =>
      attendanceReviewService.assignSuperMaster(row.classId, teacherId),
    onSuccess: async (updated, { row }) => {
      toast.success(
        updated.superMaster ? `${updated.superMaster.name} is now Super Master of ${row.classLabel}` : `${row.classLabel} has no Super Master now`,
        { description: updated.superMaster ? "Only they, or a substitute covering them, can take this class's attendance." : "Teachers can't take this class's attendance until one is assigned." }
      )
      await queryClient.invalidateQueries({ queryKey: [ATTENDANCE_REVIEW_KEY] })
    },
    onError: (error) => toast.error("Super Master not changed", { description: error instanceof Error ? error.message : undefined }),
  })
  const data = query.data
  const classesByTeacher = new Map<number, string[]>()
  for (const row of data?.classes ?? []) {
    if (row.superMaster) classesByTeacher.set(row.superMaster.teacherId, [...(classesByTeacher.get(row.superMaster.teacherId) ?? []), row.classLabel])
  }
  const rows = [...(data?.classes ?? [])].sort((a, b) => Number(b.classStatus === "Active") - Number(a.classStatus === "Active"))
  const missing = rows.filter((row) => row.classStatus === "Active" && row.state !== "assigned").length

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Super Masters"
        description="Each class has one Super Master who takes its attendance for the whole school day. When they are absent, the substitute assigned to cover them in that class can take it instead."
        actions={
          data ? (
            <StatusChip tone={missing ? "warning" : "success"} showDot>
              {missing ? `${missing} active class${missing === 1 ? " needs" : "es need"} one` : "All active classes assigned"}
            </StatusChip>
          ) : null
        }
      />
      {query.isError ? (
        <LoadError what="Super Masters" onRetry={() => void query.refetch()} />
      ) : query.isLoading || !data ? (
        <LoadingRows label="Loading Super Masters" />
      ) : !rows.length ? (
        <ClsEmpty title="No classes yet">Create classes in Academic setup first.</ClsEmpty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className={clsHeadRowClass}>
              <ClsTh className="w-[44%] pr-4 sm:w-[26%] sm:pr-6 lg:w-[22%]">Class</ClsTh>
              <ClsTh className="hidden w-[176px] pr-6 sm:table-cell">Status</ClsTh>
              <ClsTh className="pr-4 sm:pr-6 lg:w-[340px]">Super Master</ClsTh>
              <ClsTh className="hidden lg:table-cell">Also Super Master of</ClsTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const chip = STATE_CHIP[row.state]
              const others = row.superMaster ? (classesByTeacher.get(row.superMaster.teacherId) ?? []).filter((label) => label !== row.classLabel) : []
              const value = row.state === "assigned" && row.superMaster ? String(row.superMaster.teacherId) : NONE
              return (
                <TableRow key={row.classId} className={cn(clsRowClass, row.classStatus === "Active" && row.state !== "assigned" && "bg-amber-50/50 hover:bg-amber-50")}>
                  <TableCell className="pr-4 text-sm sm:pr-6">
                    <span className="block truncate font-medium text-[var(--cls-ink)]">{row.classLabel}</span>
                    {row.classStatus !== "Active" ? <span className="block text-xs text-[var(--cls-muted)]">Inactive class</span> : null}
                    <StatusChip tone={chip.tone} className="mt-1 sm:hidden">{chip.label}</StatusChip>
                  </TableCell>
                  <TableCell className="hidden pr-6 sm:table-cell">
                    <StatusChip tone={chip.tone} showDot>{chip.label}</StatusChip>
                  </TableCell>
                  <TableCell className="pr-4 sm:pr-6">
                    <Select
                      value={value}
                      disabled={save.isPending}
                      onValueChange={(next) => save.mutate({ row, teacherId: next === NONE ? null : Number(next) })}
                    >
                      <SelectTrigger className={cn(FILTER_TRIGGER_CLASS, "w-full max-w-[300px]")} aria-label={`Super Master of ${row.classLabel}`}>
                        <SelectValue placeholder="Choose a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>
                          {row.state === "inactive" && row.superMaster ? `${row.superMaster.name} (inactive)` : "Not assigned"}
                        </SelectItem>
                        <SelectSeparator />
                        {data.teachers.map((teacher) => (
                          <SelectItem key={teacher.teacherId} value={String(teacher.teacherId)}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden truncate text-sm text-[var(--cls-muted)] lg:table-cell">
                    {others.length ? others.join(", ") : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </ClsPanel>
  )
}
