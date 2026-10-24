import { useQuery } from "@tanstack/react-query"
import { BookOpen, ShieldCheck, UserCheck, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import teacherAttendanceService, { TEACHER_ATTENDANCE_KEY } from "@/api/attendance/teacher-attendance.service"
import { MetricCard } from "@/components/app/kit"
import { StatusChip } from "@/components/app/status-chip"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSchool } from "@/data/store"
import { type AttendanceStatus, isAttendancePresent } from "@/data/types"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"

/** Statuses the attendance API accepts (SRS 6.3). */
const MARK_OPTIONS: AttendanceStatus[] = ["Present", "Late", "Absent", "Leave"]

/**
 * Teacher register. Only the class's Super Master, or the substitute covering them that
 * day, may take attendance, so the class list comes from the server's responsibilities.
 */
export function TeacherAttendance() {
  const { state, saveAttendance } = useSchool()
  const actor = useActor()
  const [date, setDate] = useState(getToday)
  const responsibilities = useQuery({
    queryKey: [TEACHER_ATTENDANCE_KEY, "responsibilities", date],
    queryFn: () => teacherAttendanceService.responsibilities(date),
  })
  const classes = responsibilities.data ?? []
  const [picked, setClassId] = useState("")
  const classId = classes.some((c) => String(c.classId) === picked) ? picked : String(classes[0]?.classId ?? "")
  const current = classes.find((c) => String(c.classId) === classId)
  const [saving, setSaving] = useState(false)
  const students = useMemo(
    () => state.students.filter((student) => student.classId === classId && student.status !== "Withdrawn"),
    [state.students, classId]
  )
  const initial = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {}
    students.forEach((student) => {
      map[student.id] =
        state.attendance.find(
          (mark) => mark.studentId === student.id && mark.date === date
        )?.status ?? "Present"
    })
    return map
  }, [students, state.attendance, date])
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(initial)
  // Reload the register whenever the class, date or saved marks change, so one
  // class's unsaved picks never carry over into another register.
  const [loadedFrom, setLoadedFrom] = useState(initial)
  if (loadedFrom !== initial) {
    setLoadedFrom(initial)
    setMarks(initial)
  }
  const present = Object.values(marks).filter((status) =>
    isAttendancePresent(status)
  ).length

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={UserCheck}
          label="Present"
          value={String(present)}
          note={`of ${students.length} in this register`}
        />
        <MetricCard
          icon={Users}
          label="Absent"
          value={String(
            Object.values(marks).filter((status) => status === "Absent").length
          )}
          note="Follow up with the office"
        />
        <MetricCard
          icon={BookOpen}
          label="Leave / Excused"
          value={String(
            Object.values(marks).filter(
              (status) => status === "Leave" || status === "Excused"
            ).length
          )}
          note="Approved or informed leave"
        />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2">
                Class register
                {current ? (
                  <StatusChip tone={current.role === "SuperMaster" ? "brand" : "warning"} showDot>
                    {current.role === "SuperMaster" ? "Super Master" : `Covering ${current.coveringFor ?? "the Super Master"}`}
                  </StatusChip>
                ) : null}
              </CardTitle>
              <CardDescription>
                You take attendance for the classes you are Super Master of, or cover as a substitute that day. Changes stay in the browser until you save.
              </CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={classId}
                onValueChange={(value) => {
                  setClassId(value)
                  setMarks({})
                }}
              >
                <SelectTrigger disabled={!classes.length} aria-label="Class">
                  <SelectValue placeholder="No class to mark" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {classes.map((item) => (
                      <SelectItem key={item.classId} value={String(item.classId)}>
                        {item.classLabel}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <DatePicker
                value={date}
                onChange={(value) => {
                  setDate(value)
                  setMarks({})
                }}
                placeholder="Attendance date"
                defaultMonthKind="today"
                className="sm:max-w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {!responsibilities.isLoading && !classes.length ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
              <ShieldCheck className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">No register to take on this date</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Attendance is taken by each class's Super Master, or by the substitute assigned to cover them that day. Ask the office if you should be one.
              </p>
            </div>
          ) : null}
          {students.map((student) => {
            const status = marks[student.id] ?? initial[student.id] ?? "Present"
            return (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MARK_OPTIONS.map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={status === option ? "default" : "outline"}
                      onClick={() =>
                        setMarks({ ...initial, ...marks, [student.id]: option })
                      }
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
        </CardContent>
        <CardFooter>
          <Button
            disabled={!current || !students.length || saving}
            onClick={async () => {
              setSaving(true)
              try {
                await saveAttendance(
                  classId,
                  date,
                  students.map((student) => ({
                    studentId: student.id,
                    status: marks[student.id] ?? initial[student.id] ?? "Present",
                  })),
                  actor.name
                )
                toast.success("Attendance saved", { description: current?.classLabel })
              } catch (error) {
                toast.error("Attendance not saved", { description: error instanceof Error ? error.message : undefined })
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? "Saving…" : "Save attendance"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/** Daily update: pick one of the planned chapters, add classwork/homework/remarks, send for review (UR-04). */
