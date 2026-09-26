import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { BookOpen, UserCheck, Users } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Field, MetricCard, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { studentName, useSchool } from "@/data/store"
import { TEACHER_ID, TODAY, type AttendanceStatus, type Lesson, type LessonStatus } from "@/data/types"
import { classLabel } from "@/lib/format"

const attendanceConfig = { value: { label: "Attendance", color: "var(--chart-1)" } } satisfies ChartConfig
const week = [
  ["2026-09-21", "Mon"],
  ["2026-09-22", "Tue"],
  ["2026-09-23", "Wed"],
  ["2026-09-24", "Thu"],
  ["2026-09-25", "Fri"],
] as const

function weekdayName(date: string) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${date}T12:00:00`).getDay()]
}

export function TeacherToday({ onOpen }: { onOpen: (section: string) => void }) {
  const { state } = useSchool()
  const teacher = state.staff.find((person) => person.id === TEACHER_ID)
  const day = weekdayName(TODAY)
  const periods = state.slots.filter((slot) => slot.teacher === teacher?.name && slot.day === day).sort((a, b) => a.time.localeCompare(b.time))
  const classIds = teacher?.classIds ?? []
  const weekly = week.map(([date, label]) => {
    const marks = state.attendance.filter((mark) => classIds.includes(mark.classId) && mark.date === date)
    const present = marks.filter((mark) => mark.status === "Present").length
    return { day: label, value: marks.length ? Math.round((present / marks.length) * 100) : 0 }
  })
  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground md:p-9">
        <div className="school-grid absolute inset-0 opacity-10" />
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/60 uppercase">{day} · 23 September</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Good morning, Hassan.</h2>
          <p className="mt-2 text-sm text-primary-foreground/70">You have {periods.length} assigned periods today across {classIds.length} classes.</p>
          <Button variant="secondary" className="mt-6" onClick={() => onOpen("attendance")}><UserCheck data-icon="inline-start" />Start attendance</Button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Today’s timetable</CardTitle><CardDescription>Only periods assigned to you</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {periods.length === 0 ? <EmptyState title="No periods today" detail="Your assigned classes do not meet on this weekday." /> : periods.map((slot) => (
              <div key={slot.id} className="flex items-center gap-4 rounded-xl border p-3">
                <p className="w-12 text-xs font-semibold">{slot.time}</p>
                <Separator orientation="vertical" className="h-9" />
                <div className="flex-1"><p className="text-sm font-semibold">{classLabel(state.classes, slot.classId)}</p><p className="text-xs text-muted-foreground">{slot.subject} · {slot.room}</p></div>
                <StatusBadge value={slot.time < "09:30" ? "Complete" : slot.time < "11:15" ? "Next" : "Upcoming"} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Class pulse</CardTitle><CardDescription>Attendance across your classes</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={attendanceConfig} className="h-[205px] w-full">
              <BarChart data={weekly}><CartesianGrid vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="var(--color-value)" radius={[7, 7, 0, 0]} /></BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function TeacherClasses({ onOpen }: { onOpen: (section: string) => void }) {
  const { state } = useSchool()
  const navigate = useNavigate()
  const params = useParams()
  const classFromUrl = params["*"] ?? ""
  const teacher = state.staff.find((person) => person.id === TEACHER_ID)
  const [classId, setClassId] = useState(classFromUrl || teacher?.classIds[0] || "")
  const students = state.students.filter((student) => student.classId === classId && student.status !== "Withdrawn")

  useEffect(() => {
    if (classFromUrl && (teacher?.classIds ?? []).includes(classFromUrl)) setClassId(classFromUrl)
  }, [classFromUrl, teacher?.classIds])

  function selectClass(id: string) {
    setClassId(id)
    navigate(`/teacher/classes/${id}`)
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(teacher?.classIds ?? []).map((id) => {
          const count = state.students.filter((student) => student.classId === id && student.status === "Active").length
          const lesson = state.lessons.find((item) => item.classId === id)
          return (
            <button key={id} onClick={() => selectClass(id)} className={`rounded-xl border bg-card p-4 text-left ${classId === id ? "ring-2 ring-primary/30" : ""}`}>
              <Users className="size-4 text-muted-foreground" />
              <p className="mt-3 font-medium">{classLabel(state.classes, id)}</p>
              <p className="text-xs text-muted-foreground">{count} students · {lesson ? `${lesson.progress}% syllabus` : "No plan yet"}</p>
            </button>
          )
        })}
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>{classLabel(state.classes, classId)}</CardTitle><CardDescription>Students you can mark and assess.</CardDescription></div>
          <Button variant="outline" onClick={() => onOpen("attendance")}>Take attendance</Button>
        </CardHeader>
        <CardContent className="grid gap-2">
          {students.map((student) => <div key={student.id} className="flex items-center justify-between rounded-xl border px-3 py-3"><div><p className="text-sm font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.id}</p></div><StatusBadge value={student.status} /></div>)}
        </CardContent>
      </Card>
    </div>
  )
}

export function TeacherAttendance() {
  const { state, saveAttendance } = useSchool()
  const teacher = state.staff.find((person) => person.id === TEACHER_ID)
  const [classId, setClassId] = useState(teacher?.classIds[0] ?? "")
  const [date, setDate] = useState(TODAY)
  const students = state.students.filter((student) => student.classId === classId && student.status !== "Withdrawn")
  const initial = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {}
    students.forEach((student) => {
      map[student.id] = state.attendance.find((mark) => mark.studentId === student.id && mark.date === date)?.status ?? "Present"
    })
    return map
  }, [students, state.attendance, date])
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(initial)
  const present = Object.values(marks).filter((status) => status === "Present").length

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={UserCheck} label="Present" value={String(present)} note={`of ${students.length} in this register`} />
        <MetricCard icon={Users} label="Absent" value={String(Object.values(marks).filter((status) => status === "Absent").length)} note="Follow up with the office" />
        <MetricCard icon={BookOpen} label="Leave" value={String(Object.values(marks).filter((status) => status === "Leave").length)} note="Approved or informed leave" />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><CardTitle>Class register</CardTitle><CardDescription>Changes stay in the browser until you save.</CardDescription></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={classId} onValueChange={(value) => { setClassId(value); setMarks({}) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{(teacher?.classIds ?? []).map((id) => <SelectItem key={id} value={id}>{classLabel(state.classes, id)}</SelectItem>)}</SelectGroup></SelectContent></Select>
              <Input type="date" value={date} onChange={(event) => { setDate(event.target.value); setMarks({}) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {students.map((student) => {
            const status = marks[student.id] ?? initial[student.id] ?? "Present"
            return (
              <div key={student.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                <div className="flex-1"><p className="text-sm font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.id}</p></div>
                <div className="flex gap-2">
                  {(["Present", "Absent", "Leave"] as AttendanceStatus[]).map((option) => (
                    <Button key={option} size="sm" variant={status === option ? "default" : "outline"} onClick={() => setMarks({ ...initial, ...marks, [student.id]: option })}>{option}</Button>
                  ))}
                </div>
              </div>
            )
          })}
        </CardContent>
        <CardFooter><Button onClick={() => { saveAttendance(classId, date, students.map((student) => ({ studentId: student.id, status: marks[student.id] ?? initial[student.id] ?? "Present" })), "Hassan Ali"); toast.success("Attendance saved") }}>Save attendance</Button></CardFooter>
      </Card>
    </div>
  )
}

export function TeacherLessons() {
  const { state, updateLesson } = useSchool()
  const teacher = state.staff.find((person) => person.id === TEACHER_ID)
  const [classId, setClassId] = useState("g7b")
  const [editing, setEditing] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<LessonStatus>("In progress")
  const lessons = state.lessons.filter((lesson) => lesson.classId === classId && teacher?.subjects.includes(lesson.subject))
  return (
    <div className="grid gap-4">
      <div className="w-full sm:w-64"><Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{(teacher?.classIds ?? []).map((id) => <SelectItem key={id} value={id}>{classLabel(state.classes, id)}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
      {lessons.length === 0 ? <EmptyState title="No lessons for this class" detail="Plans appear when a subject you teach has a teaching record." /> : lessons.map((lesson) => (
        <Card key={lesson.id}>
          <CardContent className="grid gap-3 p-5 md:grid-cols-[1.4fr_auto_1fr_auto] md:items-center">
            <div><p className="font-medium">{lesson.title}</p><p className="text-xs text-muted-foreground">{lesson.subject} · target {lesson.target}</p></div>
            <StatusBadge value={lesson.status} />
            <Progress value={lesson.progress} />
            <Button variant="outline" size="sm" onClick={() => { setEditing(lesson); setProgress(lesson.progress); setStatus(lesson.status) }}>Update</Button>
          </CardContent>
        </Card>
      ))}
      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update lesson</DialogTitle></DialogHeader>
          <Field label="Progress"><Input type="number" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} /></Field>
          <Field label="Status"><Select value={status} onValueChange={(value) => setStatus(value as LessonStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{(["Planned", "In progress", "Completed"] as LessonStatus[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <DialogFooter><Button onClick={() => { if (!editing) return; updateLesson(editing.id, { progress: Math.min(100, Math.max(0, progress)), status }, "Hassan Ali"); toast.success("Lesson updated"); setEditing(null) }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TeacherUpdates() {
  const { state, addUpdate, setUpdateStatus } = useSchool()
  const teacher = state.staff.find((person) => person.id === TEACHER_ID)
  const [classId, setClassId] = useState("g7b")
  const [kind, setKind] = useState<"Homework" | "Classwork" | "Notice">("Homework")
  const [subject, setSubject] = useState("Mathematics")
  const [text, setText] = useState("")
  const [due, setDue] = useState("2026-09-25")
  const [error, setError] = useState("")
  const mine = state.updates.filter((item) => item.author === "Hassan Ali")
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader><CardTitle>Create update</CardTitle><CardDescription>Drafts stay private until management publishes them.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Class"><Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{(teacher?.classIds ?? []).map((id) => <SelectItem key={id} value={id}>{classLabel(state.classes, id)}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <Field label="Type"><Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["Homework", "Classwork", "Notice"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <Field label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
          <Field label="Due date"><Input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></Field>
          <Field label="Message" error={error}><Textarea aria-invalid={Boolean(error)} value={text} onChange={(event) => setText(event.target.value)} placeholder="Write today’s update" /></Field>
        </CardContent>
        <CardFooter>
          <Button onClick={() => { const message = addUpdate({ classId, kind, subject, text, due, author: "Hassan Ali" }); if (message) setError(message); else { setError(""); setText(""); toast.success("Draft saved for management review") } }}>Save draft</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your updates</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {mine.length === 0 ? <EmptyState title="Nothing sent yet" detail="Drafts and published notes from your classes appear here." /> : mine.map((item) => (
            <div key={item.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.text}</p><p className="mt-1 text-xs text-muted-foreground">{classLabel(state.classes, item.classId)} · {item.subject}</p></div><StatusBadge value={item.status} /></div>
              {item.status === "Draft" ? <Button className="mt-3" size="sm" variant="outline" onClick={() => { setUpdateStatus(item.id, "Approved", "Hassan Ali"); toast.success("Sent for publishing") }}>Send for approval</Button> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function TeacherMarks() {
  const { state, saveScores, setSheetStatus } = useSchool()
  const teacher = state.staff.find((person) => person.id === TEACHER_ID)
  const sheets = state.sheets.filter((sheet) => teacher?.classIds.includes(sheet.classId) && teacher.subjects.includes(sheet.subject) && !sheet.examName.includes("August"))
  const [sheetId, setSheetId] = useState(sheets[0]?.id ?? "")
  const sheet = state.sheets.find((item) => item.id === sheetId) ?? sheets[0]
  const [scores, setScores] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  if (!sheet) return <EmptyState title="No mark sheets" detail="Management has not assigned an exam to your classes." />
  const locked = sheet.status !== "Draft"
  return (
    <div className="grid gap-4">
      <Alert><AlertTitle>Controlled submission</AlertTitle><AlertDescription>After you submit, scores lock until management reopens the sheet.</AlertDescription></Alert>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>{sheet.examName}</CardTitle><CardDescription>{classLabel(state.classes, sheet.classId)} · {sheet.subject} · maximum {sheet.max}</CardDescription></div>
            <div className="w-full sm:w-72"><Select value={sheet.id} onValueChange={(value) => { setSheetId(value); setScores({}); setError("") }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{sheets.map((item) => <SelectItem key={item.id} value={item.id}>{item.subject} · {classLabel(state.classes, item.classId)}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
          </div>
          <StatusBadge value={sheet.status} />
        </CardHeader>
        <CardContent className="grid gap-2">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {sheet.rows.map((row) => (
            <div key={row.studentId} className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-xl border px-3 py-2">
              <span className="text-sm font-medium">{studentName(state.students, row.studentId)}</span>
              <Input disabled={locked} aria-invalid={Boolean(error)} type="number" min={0} max={sheet.max} value={scores[row.studentId] ?? (row.score ?? "")} onChange={(event) => setScores({ ...scores, [row.studentId]: event.target.value })} />
            </div>
          ))}
        </CardContent>
        <CardFooter className="gap-2">
          <Button variant="outline" disabled={locked} onClick={() => { const message = saveScores(sheet.id, sheet.rows.map((row) => ({ studentId: row.studentId, score: (scores[row.studentId] ?? (row.score ?? "")) === "" ? null : Number(scores[row.studentId] ?? row.score) })), "Hassan Ali"); if (message) { setError(message); toast.error(message) } else { setError(""); toast.success("Draft saved") } }}>Save draft</Button>
          <Button disabled={locked} onClick={() => { const saved = saveScores(sheet.id, sheet.rows.map((row) => ({ studentId: row.studentId, score: (scores[row.studentId] ?? (row.score ?? "")) === "" ? null : Number(scores[row.studentId] ?? row.score) })), "Hassan Ali"); if (saved) { setError(saved); toast.error(saved); return } const message = setSheetStatus(sheet.id, "Submitted", "Hassan Ali"); if (message) { setError(message); toast.error(message) } else toast.success("Sheet submitted and locked") }}>Submit sheet</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export function TeacherPortal({ section, onOpen }: { section: string; onOpen: (section: string) => void }) {
  if (section === "classes") return <TeacherClasses onOpen={onOpen} />
  if (section === "attendance") return <TeacherAttendance />
  if (section === "lessons") return <TeacherLessons />
  if (section === "updates") return <TeacherUpdates />
  if (section === "marks") return <TeacherMarks />
  return <TeacherToday onOpen={onOpen} />
}
