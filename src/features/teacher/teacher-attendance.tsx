import { BookOpen, UserCheck, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { MetricCard } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { classLabel } from "@/lib/format"

import { signedInTeacher } from "./session"

export function TeacherAttendance() {
  const { state, saveAttendance } = useSchool()
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const [classId, setClassId] = useState(teacher?.classIds[0] ?? "")
  const [date, setDate] = useState(getToday)
  const students = state.students.filter(
    (student) => student.classId === classId && student.status !== "Withdrawn"
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
            <div>
              <CardTitle>Class register</CardTitle>
              <CardDescription>
                Changes stay in the browser until you save.
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(teacher?.classIds ?? []).map((id) => (
                      <SelectItem key={id} value={id}>
                        {classLabel(state.classes, id)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setMarks({})
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
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
                  {(
                    [
                      "Present",
                      "Late",
                      "Absent",
                      "Excused",
                      "HalfDay",
                    ] as AttendanceStatus[]
                  ).map((option) => (
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
            onClick={() => {
              saveAttendance(
                classId,
                date,
                students.map((student) => ({
                  studentId: student.id,
                  status: marks[student.id] ?? initial[student.id] ?? "Present",
                })),
                actor.name
              )
              toast.success("Attendance saved")
            }}
          >
            Save attendance
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

/** Daily update: pick one of the planned chapters, add classwork/homework/remarks, send for review (UR-04). */
