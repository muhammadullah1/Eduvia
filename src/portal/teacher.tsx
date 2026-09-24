import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  ArrowRight,
  Clock3,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { SESSION_TODAY, TEACHER_CLASSES, TEACHER_NAME } from "@/data/session"
import { formatPercent, formatSchoolDay, matchesQuery } from "@/lib/format"
import {
  classRoster,
  lessonLabel,
  syllabusProgress,
  teacherSheet,
  todayMarks,
  unmarkedTeacherClasses,
} from "@/lib/selectors"
import { useSchool } from "@/lib/school-context"
import type { UpdateType } from "@/types"

import { toastResult } from "@/portal/feedback"
import {
  EmptyNote,
  MetricCard,
  SectionHeading,
  StatusBadge,
  type PortalAction,
} from "@/portal/ui"

const attendanceConfig = {
  value: { label: "Attendance", color: "var(--chart-1)" },
} satisfies ChartConfig

export function TeacherView({
  section,
  query,
  selectedClass,
  onSelectedClass,
  onOpenClass,
  onAction,
}: {
  section: string
  query: string
  selectedClass: string
  onSelectedClass: (className: string) => void
  onOpenClass: (className: string) => void
  onAction: (action: PortalAction) => void
}) {
  if (section === "My classes")
    return <Classes query={query} onOpen={onOpenClass} />
  if (section === "Attendance")
    return (
      <Attendance
        selectedClass={selectedClass}
        onSelectedClass={onSelectedClass}
        onAction={onAction}
      />
    )
  if (section === "Lesson progress")
    return (
      <Lessons
        selectedClass={selectedClass}
        onSelectedClass={onSelectedClass}
      />
    )
  if (section === "Daily updates") return <Updates query={query} />
  if (section === "Marks entry")
    return (
      <Marks
        selectedClass={selectedClass}
        onSelectedClass={onSelectedClass}
        onAction={onAction}
      />
    )
  return <Today selectedClass={selectedClass} onAction={onAction} />
}

function Today({
  selectedClass,
  onAction,
}: {
  selectedClass: string
  onAction: (action: PortalAction) => void
}) {
  const { state } = useSchool()
  const marks = todayMarks(state).filter((mark) =>
    TEACHER_CLASSES.some((item) => item.className === mark.className)
  )
  const present = marks.filter((mark) => mark.status === "Present").length
  const weekly = ["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => {
    const iso = [
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
    ][index]
    const dayMarks = state.attendance.filter(
      (mark) =>
        mark.date === iso &&
        TEACHER_CLASSES.some((item) => item.className === mark.className)
    )
    const rate = dayMarks.length
      ? Math.round(
          (dayMarks.filter((mark) => mark.status === "Present").length /
            dayMarks.length) *
            100
        )
      : 0
    return { day, value: rate }
  })
  const average = weekly
    .filter((item) => item.value > 0)
    .reduce((total, item, _, all) => total + item.value / all.length, 0)
  return (
    <div className="grid gap-6">
      <div className="teacher-hero relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground md:p-9">
        <div className="school-grid absolute inset-0 opacity-10" />
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary-foreground/55 uppercase">
            {formatSchoolDay(SESSION_TODAY)}
          </p>
          <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Good day, Hassan.
          </h2>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/65">
            {unmarkedTeacherClasses(state).length === 0
              ? "Attendance is saved for every assigned class today."
              : `${unmarkedTeacherClasses(state)
                  .map((item) => item.className)
                  .join(", ")} still need attendance.`}
          </p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() =>
              onAction({
                kind: "attendance",
                className:
                  unmarkedTeacherClasses(state)[0]?.className ?? selectedClass,
              })
            }
          >
            <UserCheck data-icon="inline-start" />
            Start attendance
          </Button>
        </div>
        <div className="relative z-10 mt-8 grid max-w-2xl grid-cols-3 gap-3">
          {[
            [String(TEACHER_CLASSES.length).padStart(2, "0"), "classes today"],
            [
              String(
                TEACHER_CLASSES.reduce(
                  (total, item) =>
                    total + classRoster(state, item.className).length,
                  0
                )
              ),
              "students",
            ],
            [
              String(
                state.updates.filter(
                  (update) =>
                    update.author === TEACHER_NAME &&
                    update.status !== "Published"
                ).length
              ).padStart(2, "0"),
              "updates open",
            ],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.06] p-3"
            >
              <p className="font-heading text-2xl font-semibold">{value}</p>
              <p className="text-[11px] text-primary-foreground/55">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today’s timetable</CardTitle>
            <CardDescription>
              Status follows whether attendance was saved
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {TEACHER_CLASSES.map((item) => {
              const saved = state.attendance.some(
                (mark) =>
                  mark.className === item.className &&
                  mark.date === SESSION_TODAY
              )
              return (
                <div
                  key={item.className}
                  className="flex items-center gap-4 rounded-xl border p-3"
                >
                  <p className="w-12 text-center text-xs font-semibold">
                    {item.time}
                  </p>
                  <Separator orientation="vertical" className="h-9" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.className}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.subject} · {item.room}
                    </p>
                  </div>
                  <StatusBadge
                    value={
                      saved
                        ? "Marked"
                        : item.className ===
                            unmarkedTeacherClasses(state)[0]?.className
                          ? "Next"
                          : "Upcoming"
                    }
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Class pulse</CardTitle>
            <CardDescription>
              {present} present across saved classes today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={attendanceConfig}
              className="h-[205px] w-full"
            >
              <BarChart data={weekly}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted p-3">
              <span className="text-xs text-muted-foreground">
                Saved-day average
              </span>
              <span className="font-heading text-xl font-semibold">
                {formatPercent(average || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Classes({
  query,
  onOpen,
}: {
  query: string
  onOpen: (className: string) => void
}) {
  const { state } = useSchool()
  const classes = TEACHER_CLASSES.filter((item) =>
    matchesQuery(query, [item.className, item.subject, item.room])
  )
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="My assigned classes"
        detail="Opening a class selects it for attendance, lessons, and marks."
      />
      {classes.length === 0 ? (
        <EmptyNote
          title="No classes match"
          detail="Clear the search to see Hassan Ali’s assignments."
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((item) => {
          const count = classRoster(state, item.className).length
          const progress = syllabusProgress(state, item.className, item.subject)
          return (
            <Card key={item.className}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-muted">
                    <Users className="size-5" />
                  </span>
                  <Badge variant="outline">2026–27</Badge>
                </div>
                <CardTitle className="mt-4">{item.className}</CardTitle>
                <CardDescription>
                  {item.subject} · {count} students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex justify-between text-xs">
                  <span>Syllabus progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => onOpen(item.className)}
                >
                  Open class <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Attendance({
  selectedClass,
  onSelectedClass,
  onAction,
}: {
  selectedClass: string
  onSelectedClass: (className: string) => void
  onAction: (action: PortalAction) => void
}) {
  const { state } = useSchool()
  const roster = classRoster(state, selectedClass)
  const saved = state.attendance.filter(
    (mark) => mark.className === selectedClass && mark.date === SESSION_TODAY
  )
  const present = saved.filter((mark) => mark.status === "Present").length
  const absent = todayMarks(state).filter(
    (mark) =>
      mark.status === "Absent" &&
      TEACHER_CLASSES.some((item) => item.className === mark.className)
  ).length
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Attendance"
        detail="Saving a class updates the parent calendar for that school day."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={UserCheck}
          label="Present in saved classes"
          value={String(
            todayMarks(state).filter(
              (mark) =>
                mark.status === "Present" &&
                TEACHER_CLASSES.some(
                  (item) => item.className === mark.className
                )
            ).length
          )}
          note="Across your assignments"
        />
        <MetricCard
          icon={Users}
          label="Absent"
          value={String(absent)}
          note="Includes the latest save"
        />
        <MetricCard
          icon={Clock3}
          label="Not yet marked"
          value={String(unmarkedTeacherClasses(state).length)}
          note={
            unmarkedTeacherClasses(state)[0]?.className ?? "All classes saved"
          }
        />
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{selectedClass}</CardTitle>
            <CardDescription>
              {
                TEACHER_CLASSES.find((item) => item.className === selectedClass)
                  ?.subject
              }{" "}
              · {roster.length} active students
              {saved.length
                ? ` · ${present} present today`
                : " · not saved today"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedClass} onValueChange={onSelectedClass}>
              <SelectTrigger className="w-48" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TEACHER_CLASSES.map((item) => (
                    <SelectItem key={item.className} value={item.className}>
                      {item.className}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                onAction({ kind: "attendance", className: selectedClass })
              }
            >
              <UserCheck data-icon="inline-start" />
              {saved.length ? "Edit marks" : "Mark now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Clock3 className="size-4" />
            <AlertTitle>
              {saved.length
                ? "Attendance is saved for this school day"
                : "Attendance window is open"}
            </AlertTitle>
            <AlertDescription>
              {saved.length
                ? "Open the sheet to change a student. The parent view uses this save."
                : "This class has not been marked for 24 September 2026."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

function Lessons({
  selectedClass,
  onSelectedClass,
}: {
  selectedClass: string
  onSelectedClass: (className: string) => void
}) {
  const { state, updateLesson } = useSchool()
  const subject =
    TEACHER_CLASSES.find((item) => item.className === selectedClass)?.subject ??
    "Mathematics"
  const lessons = state.lessons.filter(
    (lesson) => lesson.className === selectedClass && lesson.subject === subject
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [progress, setProgress] = useState("0")
  const lesson = lessons.find((item) => item.id === editing)
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Lesson progress"
        detail="Class cards use the average of these lesson records."
      />
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{subject}</CardTitle>
            <CardDescription>{selectedClass}</CardDescription>
          </div>
          <Select value={selectedClass} onValueChange={onSelectedClass}>
            <SelectTrigger className="w-48" aria-label="Class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TEACHER_CLASSES.map((item) => (
                  <SelectItem key={item.className} value={item.className}>
                    {item.className}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-3">
          {lessons.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1.3fr_1fr_2fr_auto] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  Target {item.targetDate}
                </p>
              </div>
              <StatusBadge value={lessonLabel(item.progress)} />
              <Progress value={item.progress} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(item.id)
                  setProgress(String(item.progress))
                }}
              >
                Update
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog
        open={lesson !== undefined}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lesson?.title}</DialogTitle>
          </DialogHeader>
          <label
            className="grid gap-2 text-xs font-medium"
            htmlFor="lesson-progress"
          >
            Progress (0–100)
            <Input
              id="lesson-progress"
              inputMode="numeric"
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!lesson) return
                if (
                  toastResult(
                    updateLesson(lesson.id, Number(progress), TEACHER_NAME)
                  )
                )
                  setEditing(null)
              }}
            >
              Save progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Updates({ query }: { query: string }) {
  const { state, submitUpdate, resubmitUpdate } = useSchool()
  const [className, setClassName] = useState("Grade 7 · Blue")
  const [type, setType] = useState<UpdateType>("Homework")
  const [subject, setSubject] = useState("Mathematics")
  const [due, setDue] = useState("2026-09-26")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const rows = state.updates.filter((update) =>
    matchesQuery(query, [
      update.text,
      update.className,
      update.subject,
      update.status,
      update.type,
    ])
  )
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Classwork, homework & daily updates"
        detail="Parents see an update only after management publishes it."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create update</CardTitle>
            <CardDescription>
              Empty notes are rejected. A short, specific instruction is enough.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger className="w-full" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TEACHER_CLASSES.map((item) => (
                    <SelectItem key={item.className} value={item.className}>
                      {item.className}
                    </SelectItem>
                  ))}
                  <SelectItem value="All classes">All classes</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={type}
              onValueChange={(value) => setType(value as UpdateType)}
            >
              <SelectTrigger className="w-full" aria-label="Update type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(["Homework", "Classwork", "Notice"] as const).map(
                    (item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              aria-label="Subject"
              placeholder="Subject"
            />
            <Input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              aria-label="Due date"
            />
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write today’s update…"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              onClick={() => {
                const result = submitUpdate(
                  { className, type, subject, due, text },
                  TEACHER_NAME
                )
                if (toastResult(result)) {
                  setText("")
                  setError(null)
                } else setError(result.ok ? null : result.error)
              }}
            >
              Submit for approval
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent updates</CardTitle>
            <CardDescription>
              Drafts can be submitted again. Pending items wait on management.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {rows.length === 0 ? (
              <EmptyNote
                title="No updates match"
                detail="Submit one, or clear the search."
              />
            ) : null}
            {rows.map((update) => (
              <div key={update.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{update.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {update.className} · {update.subject} · due {update.due}
                    </p>
                  </div>
                  <StatusBadge value={update.status} />
                </div>
                {update.status === "Draft" ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toastResult(resubmitUpdate(update.id, TEACHER_NAME))
                    }
                  >
                    Submit again
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Marks({
  selectedClass,
  onSelectedClass,
  onAction,
}: {
  selectedClass: string
  onSelectedClass: (className: string) => void
  onAction: (action: PortalAction) => void
}) {
  const { state } = useSchool()
  const sheet = teacherSheet(state, selectedClass)
  const entered =
    sheet?.entries.filter((entry) => entry.score !== null).length ?? 0
  const total = sheet?.entries.length ?? 0
  const scores =
    sheet?.entries
      .map((entry) => entry.score)
      .filter((score): score is number => score !== null) ?? []
  const average =
    scores.length && sheet
      ? (scores.reduce((sum, score) => sum + score, 0) /
          scores.length /
          sheet.maxMarks) *
        100
      : 0
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Exam marks"
        detail="Submit locks the sheet. Management has to reopen it before you can edit again."
      />
      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Controlled submission</AlertTitle>
        <AlertDescription>
          Out-of-range marks are rejected. A published sheet disappears from the
          parent result if it is reopened.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              {sheet ? `${sheet.exam} · ${sheet.subject}` : "No mark sheet"}
            </CardTitle>
            <CardDescription>
              {selectedClass}
              {sheet ? ` · maximum ${sheet.maxMarks}` : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedClass} onValueChange={onSelectedClass}>
              <SelectTrigger className="w-48" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TEACHER_CLASSES.map((item) => (
                    <SelectItem key={item.className} value={item.className}>
                      {item.className}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              disabled={!sheet}
              onClick={() =>
                sheet && onAction({ kind: "marks", sheetId: sheet.id })
              }
            >
              <FileCheck2 data-icon="inline-start" />
              Open mark sheet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">Entered</p>
                <p className="mt-1 font-heading text-2xl font-semibold">
                  {entered} / {total}
                </p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">
                  Average of entered
                </p>
                <p className="mt-1 font-heading text-2xl font-semibold">
                  {formatPercent(average)}
                </p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 font-heading text-2xl font-semibold">
                  {sheet.status}
                </p>
              </div>
            </div>
          ) : (
            <EmptyNote
              title="No sheet for this class"
              detail="Hassan Ali does not have a mark sheet for this section yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
