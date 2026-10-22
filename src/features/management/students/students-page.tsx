import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useState } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import { primaryGuardian } from "@/api/students/map-student"
import studentsService from "@/api/students/students.service"
import {
  clsHeadRowClass,
  ClsPanel,
  clsRowClass,
  ClsStatCard,
  ClsTh,
} from "@/components/app/cls-panel"
import { PaginationComponent } from "@/components/common/pagination-component"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { StudentStatusChip } from "./student-status-chip"

const ALL = "all"
const STATUSES = ["Active", "Pending", "Inactive", "Graduated", "StruckOff", "Withdrawn"]
const COLUMNS = 6

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** School-wide count for one status (all statuses when omitted). */
function useStudentCount(status?: string) {
  return useQuery({
    queryKey: ["students", "count", status ?? ALL],
    queryFn: async () => {
      const data = await studentsService.list({ status, page: 1, pageSize: 1 })
      return data.pagination?.total ?? data.students.length
    },
    staleTime: 30_000,
  })
}

type Props = {
  query: string
  onOpenStudent: (id: number) => void
}

/** Enrolled students across the school, styled like the admissions list. */
export function StudentsPage({ query, onOpenStudent }: Props) {
  const [search, setSearch] = useState("")
  const [classId, setClassId] = useState(ALL)
  const [status, setStatus] = useState("Active")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const term = useDebounced((search || query).trim())

  const sessionsQuery = useSessionsList()
  const current = sessionsQuery.data?.find((session) => session.current)
  const classesQuery = useClassesList(current ? Number(current.id) : undefined)

  const totalCount = useStudentCount()
  const activeCount = useStudentCount("Active")
  const pendingCount = useStudentCount("Pending")
  const withdrawnCount = useStudentCount("Withdrawn")

  const studentsQuery = useQuery({
    queryKey: ["students", "directory", term, classId, status, page, pageSize],
    placeholderData: keepPreviousData,
    queryFn: () =>
      studentsService.list({
        search: term || undefined,
        classId: classId === ALL ? undefined : Number(classId),
        status: status === ALL ? undefined : status,
        page,
        pageSize,
      }),
  })

  const students = studentsQuery.data?.students ?? []
  const pagination = studentsQuery.data?.pagination ?? {
    total: students.length,
    page,
    pageSize,
    totalPages: 1,
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">
          Students
        </h1>
        <p className="mt-1 text-sm text-[var(--cls-muted)]">
          Everyone enrolled at the school. Open a student to see their details,
          guardians and history.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ClsStatCard label="Total students" value={totalCount.data ?? "—"} hint="All statuses" />
        <ClsStatCard label="Active" value={activeCount.data ?? "—"} hint="Currently enrolled" accent="success" />
        <ClsStatCard label="Pending" value={pendingCount.data ?? "—"} hint="Awaiting enrollment" accent="warning" />
        <ClsStatCard label="Withdrawn" value={withdrawnCount.data ?? "—"} hint="Left the school" />
      </div>

      <ClsPanel>
        <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 pt-4 pb-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by name or admission no."
              aria-label="Search students"
              className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
            />
          </div>
          <div className="flex gap-2 md:ml-auto">
            <Select
              value={classId}
              onValueChange={(value) => {
                setClassId(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="border-[var(--cls-border)] md:w-44" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classesQuery.data ?? []).map((klass) => (
                  <SelectItem key={klass.id} value={String(klass.id)}>
                    {classDisplayName(klass)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="border-[var(--cls-border)] md:w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "StruckOff" ? "Struck off" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {studentsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-base font-medium text-[var(--cls-ink)]">Could not load students</p>
            <Button variant="outline" onClick={() => void studentsQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className={cn(studentsQuery.isFetching && "opacity-70")}>
              <TableHeader>
                <TableRow className={clsHeadRowClass}>
                  <ClsTh>Admission no.</ClsTh>
                  <ClsTh>Student</ClsTh>
                  <ClsTh>Class</ClsTh>
                  <ClsTh>Guardian</ClsTh>
                  <ClsTh>Admitted</ClsTh>
                  <ClsTh>Status</ClsTh>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-[var(--cls-muted)]">
                      Loading students…
                    </TableCell>
                  </TableRow>
                ) : null}
                {!studentsQuery.isLoading && students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="h-24 text-center text-sm text-[var(--cls-muted)]">
                      No students match these filters. Try another class or status.
                    </TableCell>
                  </TableRow>
                ) : null}
                {students.map((student) => {
                  const guardian = primaryGuardian(student)
                  const admitted = (student as { admissionDate?: string | null }).admissionDate
                  return (
                    <TableRow
                      key={student.id}
                      className={cn("cursor-pointer", clsRowClass)}
                      onClick={() => onOpenStudent(student.id)}
                    >
                      <TableCell className="font-mono text-xs text-[var(--cls-muted)]">
                        {student.admissionNo}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-[var(--cls-ink)]">
                            {`${student.firstName} ${student.lastName}`.trim()}
                          </span>
                          {student.gender ? (
                            <span className="text-xs text-[var(--cls-muted)]">{student.gender}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[var(--cls-ink)]">
                        {student.class?.label ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-[var(--cls-ink)]">{guardian.name || "—"}</span>
                          {guardian.phone ? (
                            <span className="text-xs text-[var(--cls-muted)]">{guardian.phone}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-[var(--cls-ink)]">
                        {admitted ? formatDate(admitted) : "—"}
                      </TableCell>
                      <TableCell>
                        <StudentStatusChip status={student.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
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
      </ClsPanel>
    </div>
  )
}
