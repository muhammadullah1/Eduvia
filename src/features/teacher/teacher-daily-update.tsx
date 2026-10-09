import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, Field, StatusBadge } from "@/components/app/kit"
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
import { Textarea } from "@/components/ui/textarea"
import { useSchool } from "@/data/store"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { classLabel, formatDate } from "@/lib/format"

import { signedInTeacher } from "./session"

export function TeacherDailyUpdate() {
  const { state, submitDailyLesson } = useSchool()
  const actor = useActor()
  const today = getToday()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const [classId, setClassId] = useState(teacher?.classIds[0] ?? "")
  const [chapterId, setChapterId] = useState("")
  const [form, setForm] = useState({ classwork: "", homework: "", remarks: "" })
  const chapters = state.plannedChapters
    .filter(
      (row) => row.classId === classId && row.subject === teacher?.subject
    )
    .sort((a, b) => a.sequence - b.sequence)
  const mine = state.dailyLessons
    .filter((row) => row.teacherId === teacherId)
    .sort((a, b) => b.date.localeCompare(a.date))
  const todayLesson = mine.find(
    (row) => row.classId === classId && row.date === today
  )

  function submit() {
    const message = submitDailyLesson(
      { classId, date: today, chapterId, ...form },
      actor
    )
    if (message) toast.error(message)
    else {
      toast.success("Sent to management for review")
      setForm({ classwork: "", homework: "", remarks: "" })
      setChapterId("")
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Today’s update · {formatDate(today)}</CardTitle>
          <CardDescription>
            {teacher?.subject}. Parents see it once management approves it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Class">
            <Select
              value={classId}
              onValueChange={(value) => {
                setClassId(value)
                setChapterId("")
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
          </Field>
          <Field
            label="Chapter taught"
            hint={
              chapters.length
                ? undefined
                : "No chapters are planned for this class yet — ask the operations manager."
            }
          >
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose planned chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {chapters.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Classwork (optional)">
            <Textarea
              value={form.classwork}
              onChange={(event) =>
                setForm({ ...form, classwork: event.target.value })
              }
            />
          </Field>
          <Field label="Homework (optional)">
            <Textarea
              value={form.homework}
              onChange={(event) =>
                setForm({ ...form, homework: event.target.value })
              }
            />
          </Field>
          <Field label="Remarks (optional)">
            <Input
              value={form.remarks}
              onChange={(event) =>
                setForm({ ...form, remarks: event.target.value })
              }
            />
          </Field>
          {todayLesson ? (
            <p className="text-xs text-muted-foreground">
              Today’s update for this class is{" "}
              {todayLesson.reviewStatus.toLowerCase()}
              {todayLesson.reviewStatus === "Approved"
                ? "."
                : "; submitting again replaces it."}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            disabled={!chapterId || todayLesson?.reviewStatus === "Approved"}
            onClick={submit}
          >
            Submit for review
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your daily updates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {mine.length === 0 ? (
            <EmptyState
              title="Nothing sent yet"
              detail="Your submitted updates appear here with their review status."
            />
          ) : (
            mine.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {
                        state.plannedChapters.find(
                          (item) => item.id === row.chapterId
                        )?.title
                      }
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {classLabel(state.classes, row.classId)} · {row.subject} ·{" "}
                      {formatDate(row.date)}
                    </p>
                  </div>
                  <StatusBadge value={row.reviewStatus} />
                </div>
                {row.homework ? (
                  <p className="mt-2 text-sm">Homework: {row.homework}</p>
                ) : null}
                {row.reviewNote ? (
                  <p className="mt-2 text-xs text-destructive">
                    {row.reviewedBy}: {row.reviewNote}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Scheduled weekly tests for the teacher's own subject and classes (UR-05). */
