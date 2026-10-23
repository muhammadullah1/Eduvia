import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ArrowUpRight, RefreshCcw, Search } from "lucide-react"
import { useEffect, useState } from "react"

import type { LifecycleStatus } from "@/api/students/lifecycle.service"
import studentsService from "@/api/students/students.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass, ClsTh } from "@/components/app/cls-panel"
import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import type { ApiStudent } from "@/lib/api-types"
import { cn } from "@/lib/utils"

import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"
import { StudentStatusChip } from "../students/student-status-chip"
import { ChangeStatusDialog, type LifecycleStudent } from "./change-status-dialog"
import { STATUS_LABELS } from "./lifecycle-rules"
import { ClassPicker } from "./lifecycle-shared"
import { PromoteDialog } from "./promote-dialog"

const ALL = "all"
const STATUSES = Object.keys(STATUS_LABELS) as LifecycleStatus[]

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const nameOf = (student: ApiStudent) =>
  `${student.firstName} ${student.lastName === "-" ? "" : student.lastName}`.trim()

const toLifecycleStudent = (student: ApiStudent) => ({
  id: student.id,
  name: nameOf(student),
  admissionNo: student.admissionNo,
  status: student.status,
  classLabel: student.class?.label ?? null,
  classId: student.fkClassId,
  admittedOn: student.admittedOn ?? null,
})

/** Find a student in any status and change their status or promote them. */
export function ChangeStatusPanel() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState(ALL)
  const [classId, setClassId] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [changing, setChanging] = useState<LifecycleStudent | null>(null)
  const [promoting, setPromoting] = useState<ReturnType<typeof toLifecycleStudent> | null>(null)
  const term = useDebounced(search.trim())

  const current = useSessionsList().data?.find((session) => session.current)
  const classes = useClassesList(current ? Number(current.id) : undefined).data ?? []

  const query = useQuery({
    queryKey: ["students", "lifecycle-directory", term, status, classId, page, pageSize],
    placeholderData: keepPreviousData,
    queryFn: () =>
      studentsService.list({
        search: term || undefined,
        status: status === ALL ? undefined : status,
        classId: classId ? Number(classId) : undefined,
        page,
        pageSize,
      }),
  })
  const students = query.data?.students ?? []
  const pagination = query.data?.pagination ?? { total: students.length, page, pageSize, totalPages: 1 }

  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Change status"
        description="Deactivate, reactivate, graduate, strike off or readmit a student. Every change is recorded with a reason."
      />
      <div className="flex flex-col gap-2 border-b border-[var(--cls-border)] px-4 py-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search name or admission no."
            className="pl-9"
            aria-label="Search students"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:ml-auto md:w-96">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full border-[var(--cls-border)]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {STATUS_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ClassPicker
            id="lifecycle-class"
            value={classId}
            onChange={(value) => {
              setClassId(value)
              setPage(1)
            }}
            classes={classes}
            placeholder="Any class"
          />
        </div>
      </div>
      {query.isError ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-base font-medium text-[var(--cls-ink)]">Could not load students</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.isLoading ? (
        <div className="flex flex-col gap-2 p-4" aria-label="Loading students">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : !students.length ? (
        <ClsEmpty title="No students found">Try another name, status or class.</ClsEmpty>
      ) : (
        <Table className={cn("table-fixed", query.isFetching && "opacity-70")}>
          <TableHeader>
            <TableRow className={clsHeadRowClass}>
              <ClsTh>Student</ClsTh>
              <ClsTh className="w-[18%]">Class</ClsTh>
              <ClsTh className="w-[14%]">Status</ClsTh>
              <ClsTh className="w-[260px] text-right">Actions</ClsTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} className={clsRowClass}>
                <TableCell>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-[var(--cls-ink)]">{nameOf(student)}</span>
                    <span className="truncate font-mono text-[11px] text-[var(--cls-muted)]">{student.admissionNo}</span>
                  </div>
                </TableCell>
                <TableCell className="truncate text-sm text-[var(--cls-muted)]">{student.class?.label ?? "—"}</TableCell>
                <TableCell>
                  <StudentStatusChip status={student.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {student.status === "Active" ? (
                      <Button size="sm" variant="outline" onClick={() => setPromoting(toLifecycleStudent(student))}>
                        <ArrowUpRight data-icon="inline-start" />
                        Promote
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => setChanging(toLifecycleStudent(student))}>
                      <RefreshCcw data-icon="inline-start" />
                      Change status
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaginationComponent
        pagination={{
          ...pagination,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size)
            setPage(1)
          },
        }}
      />
      <ChangeStatusDialog student={changing} onOpenChange={(open) => !open && setChanging(null)} />
      <PromoteDialog student={promoting} onOpenChange={(open) => !open && setPromoting(null)} />
    </ClsPanel>
  )
}
