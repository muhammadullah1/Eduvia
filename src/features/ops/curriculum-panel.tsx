import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, Field } from "@/components/app/kit"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useSchool } from "@/data/store"
import { useActor } from "@/lib/actor"
import { classLabel, formatDate } from "@/lib/format"

import { ClassSubjectPicker } from "./class-subject-picker"

// ---- planned chapters (UR-04) ------------------------------------------------------

export function CurriculumPanel() {
  const { state, addPlannedChapter, removePlannedChapter } = useSchool()
  const actor = useActor()
  const [selectedClassId, setClassId] = useState("")
  const classId =
    selectedClassId && state.classes.some((c) => c.id === selectedClassId)
      ? selectedClassId
      : (state.classes.find(
          (c) => c.label.includes("Grade 7") || c.id === "g7b"
        )?.id ??
        state.classes[0]?.id ??
        "g7b")
  const [subject, setSubject] = useState("Mathematics")
  const [form, setForm] = useState({
    title: "",
    targetDate: "",
    description: "",
  })
  const chapters = state.plannedChapters
    .filter((row) => row.classId === classId && row.subject === subject)
    .sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Planned chapters</CardTitle>
          <CardDescription>
            Teachers pick from this list when posting a daily update.
          </CardDescription>
          <ClassSubjectPicker
            classId={classId}
            subject={subject}
            onClass={setClassId}
            onSubject={setSubject}
          />
        </CardHeader>
        <CardContent>
          {chapters.length === 0 ? (
            <EmptyState
              title="No chapters planned"
              detail="Add the first chapter for this class and subject."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Daily updates</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapters.map((chapter) => {
                  const updates = state.dailyLessons.filter(
                    (lesson) => lesson.chapterId === chapter.id
                  )
                  return (
                    <TableRow key={chapter.id}>
                      <TableCell>{chapter.sequence}</TableCell>
                      <TableCell>
                        <p className="font-medium">{chapter.title}</p>
                        {chapter.description ? (
                          <p className="text-xs text-muted-foreground">
                            {chapter.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {chapter.targetDate
                          ? formatDate(chapter.targetDate)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {updates.length
                          ? `${updates.filter((lesson) => lesson.reviewStatus === "Approved").length} approved / ${updates.length}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updates.length > 0}
                          onClick={() => {
                            const message = removePlannedChapter(
                              chapter.id,
                              actor
                            )
                            if (message) toast.error(message)
                            else toast.success("Chapter removed")
                          }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Add chapter</CardTitle>
          <CardDescription>
            {classLabel(state.classes, classId)} · {subject}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Chapter 7 — Data handling"
            />
          </Field>
          <Field label="Target date">
            <Input
              type="date"
              value={form.targetDate}
              onChange={(event) =>
                setForm({ ...form, targetDate: event.target.value })
              }
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => {
              const message = addPlannedChapter(
                {
                  classId,
                  subject,
                  title: form.title,
                  targetDate: form.targetDate || undefined,
                  description: form.description || undefined,
                },
                actor
              )
              if (message) toast.error(message)
              else {
                toast.success("Chapter planned")
                setForm({ title: "", targetDate: "", description: "" })
              }
            }}
          >
            Add chapter
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
