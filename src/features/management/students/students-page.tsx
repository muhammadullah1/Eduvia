import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useEffect, useState } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import { primaryGuardian } from "@/api/students/map-student"
import studentsService from "@/api/students/students.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClassesList } from "@/features/management/classes/hooks/use-classes"
import { useSessionsList } from "@/features/management/sessions/hooks/use-sessions"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25
const ALL = "all"
const STATUSES = ["Active", "Pending", "Inactive", "Graduated", "StruckOff", "Withdrawn"]

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Enrolled students across the school, with their primary guardian and contact number. */
export function StudentsPage({ query }: { query: string }) {
  const [search, setSearch] = useState("")
  const [classId, setClassId] = useState(ALL)
  const [status, setStatus] = useState("Active")
  const [page, setPage] = useState(1)
  const term = useDebounced((search || query).trim())

  const sessionsQuery = useSessionsList()
  const current = sessionsQuery.data?.find((session) => session.current)
  const classesQuery = useClassesList(current ? Number(current.id) : undefined)

  const studentsQuery = useQuery({
    queryKey: ["students", "directory", term, classId, status, page],
    placeholderData: keepPreviousData,
    queryFn: () =>
      studentsService.list({
        search: term || undefined,
        classId: classId === ALL ? undefined : Number(classId),
        status: status === ALL ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const students = studentsQuery.data?.students ?? []
  const total = studentsQuery.data?.pagination?.total ?? students.length
  const totalPages = Math.max(1, studentsQuery.data?.pagination?.totalPages ?? 1)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#0F172A]">Students</h1>
        <p className="text-sm text-[#64748B]">
          {studentsQuery.isLoading ? "Loading students…" : `${total} student${total === 1 ? "" : "s"}`}
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search by name or admission no."
            aria-label="Search students"
            className="h-10 pl-9"
          />
        </div>
        <Select
          value={classId}
          onValueChange={(value) => {
            setClassId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="h-10 md:w-48" aria-label="Class">
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
          <SelectTrigger className="h-10 md:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
        {studentsQuery.isError ? (
          <div className="px-6 py-10 text-center text-sm text-red-700">
            {studentsQuery.error instanceof Error ? studentsQuery.error.message : "Could not load students."}
            <div>
              <Button className="mt-3" variant="outline" onClick={() => void studentsQuery.refetch()}>
                Try again
              </Button>
            </div>
          </div>
        ) : students.length === 0 && !studentsQuery.isLoading ? (
          <p className="px-6 py-14 text-center text-sm text-[#64748B]">No students match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[820px] text-left text-sm", studentsQuery.isFetching && "opacity-70")}>
              <thead className="bg-[#F8FAFC] text-[11px] tracking-wide text-[#64748B] uppercase">
                <tr>
                  {["Student", "Admission no.", "Class", "Guardian", "Contact", "Status"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const guardian = primaryGuardian(student)
                  return (
                    <tr key={student.id} className="border-t border-[var(--cls-border)]">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">
                        {`${student.firstName} ${student.lastName}`.trim()}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{student.admissionNo}</td>
                      <td className="px-4 py-3">{student.class?.label ?? "—"}</td>
                      <td className="px-4 py-3">{guardian.name || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {guardian.phone ? <a className="text-[var(--primary-color)]" href={`tel:${guardian.phone}`}>{guardian.phone}</a> : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            student.status === "Active" ? "bg-[var(--secondary-color)] text-[var(--primary-color)]" : "bg-[#F1F5F9] text-[#64748B]"
                          )}
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-[var(--cls-border)] px-4 py-3 text-sm text-[#64748B]">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
