import { Users } from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSchool } from "@/data/store"
import { classLabel } from "@/lib/format"

import { signedInTeacher } from "./session"

export function TeacherClasses({
  onOpen,
}: {
  onOpen: (section: string) => void
}) {
  const { state } = useSchool()
  const navigate = useNavigate()
  const params = useParams()
  const classFromUrl = params["*"] ?? ""
  const teacher = signedInTeacher(state.staff)
  const [selectedClassId, setSelectedClassId] = useState("")
  const validUrlClass =
    classFromUrl && (teacher?.classIds ?? []).includes(classFromUrl)
      ? classFromUrl
      : ""
  const classId = selectedClassId || validUrlClass || teacher?.classIds[0] || ""
  const students = state.students.filter(
    (student) => student.classId === classId && student.status !== "Withdrawn"
  )

  function selectClass(id: string) {
    setSelectedClassId(id)
    navigate(`/teacher/classes/${id}`)
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(teacher?.classIds ?? []).map((id) => {
          const count = state.students.filter(
            (student) => student.classId === id && student.status === "Active"
          ).length
          const planned = state.plannedChapters.filter(
            (item) => item.classId === id && item.subject === teacher?.subject
          )
          const covered = new Set(
            state.dailyLessons
              .filter(
                (item) =>
                  item.classId === id &&
                  item.subject === teacher?.subject &&
                  item.reviewStatus === "Approved"
              )
              .map((item) => item.chapterId)
          )
          return (
            <button
              key={id}
              onClick={() => selectClass(id)}
              className={`rounded-xl border bg-card p-4 text-left ${classId === id ? "ring-2 ring-primary/30" : ""}`}
            >
              <Users className="size-4 text-muted-foreground" />
              <p className="mt-3 font-medium">
                {classLabel(state.classes, id)}
              </p>
              <p className="text-xs text-muted-foreground">
                {count} students ·{" "}
                {planned.length
                  ? `${covered.size}/${planned.length} chapters approved`
                  : "No chapter plan yet"}
              </p>
            </button>
          )
        })}
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{classLabel(state.classes, classId)}</CardTitle>
            <CardDescription>Students you can mark and assess.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => onOpen("attendance")}>
            Take attendance
          </Button>
        </CardHeader>
        <CardContent className="grid gap-2">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between rounded-xl border px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.id}</p>
              </div>
              <StatusBadge value={student.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
