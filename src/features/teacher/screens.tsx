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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { MarksDialog } from "@/features/ops/screens"
import { studentName, useSchool } from "@/data/store"
import { TODAY, type AttendanceStatus, type WeeklyTest } from "@/data/types"
import { teacherDuties, weekdayOf } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { loadAuth } from "@/lib/auth"
import { monthLabel } from "@/lib/fees"
import { classLabel, formatDate } from "@/lib/format"

const attendanceConfig = { value: { label: "Attendance", color: "var(--chart-1)" } } satisfies ChartConfig

function signedInTeacher<T extends { email: string }>(staff: T[]) {
  const email = loadAuth()?.user?.email
  return staff.find((person) => person.email === email)
}

function schoolWeek(today: string) {
  const date = new Date(`${today}T00:00:00`)
  const weekday = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1))
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    const month = String(day.getMonth() + 1).padStart(2, "0")
    const dateNumber = String(day.getDate()).padStart(2, "0")
    return [`${day.getFullYear()}-${month}-${dateNumber}`, ["Mon", "Tue", "Wed", "Thu", "Fri"][index]] as const
  })
}

export function TeacherToday({ onOpen }: { onOpen: (section: string) => void }) {
  const { state } = useSchool()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const day = weekdayOf(TODAY)
  // Own timetable plus any class assigned to this teacher as a substitute today (UR-03).
  const periods = teacherDuties(teacherId, TODAY, state.slots, state.substitutions)
  const timeOf = (classId: string, periodIndex: number) => state.slots.find((slot) => slot.classId === classId && slot.day === day && slot.periodIndex === periodIndex)
  const covering = periods.filter((duty) => duty.substitute).length
  const classIds = teacher?.classIds ?? []
  const weekly = schoolWeek(TODAY).map(([date, label]) => {
    const marks = state.attendance.filter((mark) => classIds.includes(mark.classId) && mark.date === date)
    const present = marks.filter((mark) => mark.status === "Present").length
    return { day: label, value: marks.length ? Math.round((present / marks.length) * 100) : 0 }
  })
  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground md:p-9">
        <div className="school-grid absolute inset-0 opacity-10" />
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/60 uppercase">{day} · {formatDate(TODAY)}</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Good morning, {teacher?.name.split(" ")[0] ?? "teacher"}.</h2>
          <p className="mt-2 text-sm text-primary-foreground/70">You have {periods.length} periods today{covering ? `, including ${covering} substitute ${covering === 1 ? "class" : "classes"}` : ""}. You teach {teacher?.subject}.</p>
          <Button variant="secondary" className="mt-6" onClick={() => onOpen("attendance")}><UserCheck data-icon="inline-start" />Start attendance</Button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Today’s timetable</CardTitle><CardDescription>Your periods and any substitute duty assigned by the operations manager</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {periods.length === 0 ? <EmptyState title="No periods today" detail="Your assigned classes do not meet on this weekday." /> : periods.map((duty) => {
              const slot = timeOf(duty.classId, duty.periodIndex)
              return (
                <div key={`${duty.classId}-${duty.periodIndex}`} className={`flex items-center gap-4 rounded-xl border p-3 ${duty.substitute ? "border-[var(--warning)]/40 bg-[var(--warning-light)]/40" : ""}`}>
                  <p className="w-14 text-xs font-semibold">P{duty.periodIndex}<span className="block font-normal text-muted-foreground">{slot?.time}</span></p>
                  <Separator orientation="vertical" className="h-9" />
                  <div className="flex-1"><p className="text-sm font-semibold">{classLabel(state.classes, duty.classId)}</p><p className="text-xs text-muted-foreground">{duty.subject} · {slot?.room}</p></div>
                  {duty.substitute ? <StatusBadge value="Substitute" /> : null}
                </div>
              )
            })}
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
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
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
          const planned = state.plannedChapters.filter((item) => item.classId === id && item.subject === teacher?.subject)
          const covered = new Set(state.dailyLessons.filter((item) => item.classId === id && item.subject === teacher?.subject && item.reviewStatus === "Approved").map((item) => item.chapterId))
          return (
            <button key={id} onClick={() => selectClass(id)} className={`rounded-xl border bg-card p-4 text-left ${classId === id ? "ring-2 ring-primary/30" : ""}`}>
              <Users className="size-4 text-muted-foreground" />
              <p className="mt-3 font-medium">{classLabel(state.classes, id)}</p>
              <p className="text-xs text-muted-foreground">{count} students · {planned.length ? `${covered.size}/${planned.length} chapters approved` : "No chapter plan yet"}</p>
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
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
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
        <CardFooter><Button onClick={() => { saveAttendance(classId, date, students.map((student) => ({ studentId: student.id, status: marks[student.id] ?? initial[student.id] ?? "Present" })), actor.name); toast.success("Attendance saved") }}>Save attendance</Button></CardFooter>
      </Card>
    </div>
  )
}

/** Daily update: pick one of the planned chapters, add classwork/homework/remarks, send for review (UR-04). */
export function TeacherDailyUpdate() {
  const { state, submitDailyLesson } = useSchool()
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const [classId, setClassId] = useState(teacher?.classIds[0] ?? "")
  const [chapterId, setChapterId] = useState("")
  const [form, setForm] = useState({ classwork: "", homework: "", remarks: "" })
  const chapters = state.plannedChapters.filter((row) => row.classId === classId && row.subject === teacher?.subject).sort((a, b) => a.sequence - b.sequence)
  const mine = state.dailyLessons.filter((row) => row.teacherId === teacherId).sort((a, b) => b.date.localeCompare(a.date))
  const today = mine.find((row) => row.classId === classId && row.date === TODAY)

  function submit() {
    const message = submitDailyLesson({ classId, date: TODAY, chapterId, ...form }, actor)
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
        <CardHeader><CardTitle>Today’s update · {formatDate(TODAY)}</CardTitle><CardDescription>{teacher?.subject}. Parents see it once management approves it.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Class"><Select value={classId} onValueChange={(value) => { setClassId(value); setChapterId("") }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{(teacher?.classIds ?? []).map((id) => <SelectItem key={id} value={id}>{classLabel(state.classes, id)}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <Field label="Chapter taught" hint={chapters.length ? undefined : "No chapters are planned for this class yet — ask the operations manager."}>
            <Select value={chapterId} onValueChange={setChapterId}><SelectTrigger><SelectValue placeholder="Choose planned chapter" /></SelectTrigger><SelectContent><SelectGroup>{chapters.map((row) => <SelectItem key={row.id} value={row.id}>{row.title}</SelectItem>)}</SelectGroup></SelectContent></Select>
          </Field>
          <Field label="Classwork (optional)"><Textarea value={form.classwork} onChange={(event) => setForm({ ...form, classwork: event.target.value })} /></Field>
          <Field label="Homework (optional)"><Textarea value={form.homework} onChange={(event) => setForm({ ...form, homework: event.target.value })} /></Field>
          <Field label="Remarks (optional)"><Input value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></Field>
          {today ? <p className="text-xs text-muted-foreground">Today’s update for this class is {today.reviewStatus.toLowerCase()}{today.reviewStatus === "Approved" ? "." : "; submitting again replaces it."}</p> : null}
        </CardContent>
        <CardFooter><Button disabled={!chapterId || today?.reviewStatus === "Approved"} onClick={submit}>Submit for review</Button></CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your daily updates</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {mine.length === 0 ? <EmptyState title="Nothing sent yet" detail="Your submitted updates appear here with their review status." /> : mine.map((row) => (
            <div key={row.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-medium">{state.plannedChapters.find((item) => item.id === row.chapterId)?.title}</p><p className="mt-1 text-xs text-muted-foreground">{classLabel(state.classes, row.classId)} · {row.subject} · {formatDate(row.date)}</p></div>
                <StatusBadge value={row.reviewStatus} />
              </div>
              {row.homework ? <p className="mt-2 text-sm">Homework: {row.homework}</p> : null}
              {row.reviewNote ? <p className="mt-2 text-xs text-destructive">{row.reviewedBy}: {row.reviewNote}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** Scheduled weekly tests for the teacher's own subject and classes (UR-05). */
export function TeacherWeeklyTests() {
  const { state } = useSchool()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const [marking, setMarking] = useState<WeeklyTest | null>(null)
  const month = TODAY.slice(0, 7)
  const tests = state.weeklyTests
    .filter((test) => test.month === month && test.subject === teacher?.subject && teacher.classIds.includes(test.classId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.classId.localeCompare(b.classId))

  return (
    <Card>
      <CardHeader><CardTitle>Weekly tests · {monthLabel(month)}</CardTitle><CardDescription>Enter marks on or after the test day. Management publishes them to parents.</CardDescription></CardHeader>
      <CardContent className="grid gap-2">
        {tests.length === 0 ? <EmptyState title="No tests scheduled" detail="The operations manager sets one test day per subject." /> : tests.map((test) => {
          const entered = test.results.filter((row) => row.score !== null).length
          const due = test.date <= TODAY
          return (
            <div key={test.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
              <div><p className="text-sm font-medium">{classLabel(state.classes, test.classId)} · week {test.week}</p><p className="text-xs text-muted-foreground">{weekdayOf(test.date)} {formatDate(test.date)} · out of {test.max} · {entered}/{test.results.length} marks</p></div>
              <div className="flex items-center gap-2">
                <StatusBadge value={test.status === "Scheduled" && !due ? "Upcoming" : test.status} />
                {test.status !== "Published" && due ? <Button size="sm" variant="outline" onClick={() => setMarking(test)}>{entered ? "Edit marks" : "Enter marks"}</Button> : null}
              </div>
            </div>
          )
        })}
      </CardContent>
      <MarksDialog test={marking} onClose={() => setMarking(null)} />
    </Card>
  )
}

export function TeacherUpdates() {
  const { state, addUpdate, setUpdateStatus } = useSchool()
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const [selectedClassId, setClassId] = useState("")
  const classId = (selectedClassId && (teacher?.classIds ?? []).includes(selectedClassId))
    ? selectedClassId
    : (teacher?.classIds?.[0] ?? state.classes[0]?.id ?? "g7b")
  const [kind, setKind] = useState<"Homework" | "Classwork" | "Notice">("Notice")
  const [subject, setSubject] = useState(teacher?.subject ?? "")
  const [text, setText] = useState("")
  const [due, setDue] = useState("2026-09-25")
  const [error, setError] = useState("")
  const mine = state.updates.filter((item) => item.author === actor.name)
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
          <Button onClick={() => { const message = addUpdate({ classId, kind, subject, text, due, author: actor.name }); if (message) setError(message); else { setError(""); setText(""); toast.success("Draft saved for management review") } }}>Save draft</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your updates</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {mine.length === 0 ? <EmptyState title="Nothing sent yet" detail="Drafts and published notes from your classes appear here." /> : mine.map((item) => (
            <div key={item.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.text}</p><p className="mt-1 text-xs text-muted-foreground">{classLabel(state.classes, item.classId)} · {item.subject}</p></div><StatusBadge value={item.status} /></div>
              {item.status === "Draft" ? <Button className="mt-3" size="sm" variant="outline" onClick={() => { setUpdateStatus(item.id, "Approved", actor.name); toast.success("Sent for publishing") }}>Send for approval</Button> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function TeacherMarks() {
  const { state, saveScores, setSheetStatus } = useSchool()
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const sheets = state.sheets.filter((sheet) => teacher?.classIds.includes(sheet.classId) && teacher.subject === sheet.subject && !sheet.examName.includes("August"))
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
          <Button variant="outline" disabled={locked} onClick={() => { const message = saveScores(sheet.id, sheet.rows.map((row) => ({ studentId: row.studentId, score: (scores[row.studentId] ?? (row.score ?? "")) === "" ? null : Number(scores[row.studentId] ?? row.score) })), actor.name); if (message) { setError(message); toast.error(message) } else { setError(""); toast.success("Draft saved") } }}>Save draft</Button>
          <Button disabled={locked} onClick={() => { const saved = saveScores(sheet.id, sheet.rows.map((row) => ({ studentId: row.studentId, score: (scores[row.studentId] ?? (row.score ?? "")) === "" ? null : Number(scores[row.studentId] ?? row.score) })), actor.name); if (saved) { setError(saved); toast.error(saved); return } const message = setSheetStatus(sheet.id, "Submitted", actor.name); if (message) { setError(message); toast.error(message) } else toast.success("Sheet submitted and locked") }}>Submit sheet</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export function TeacherPortal({ section, onOpen }: { section: string; onOpen: (section: string) => void }) {
  if (section === "classes") return <TeacherClasses onOpen={onOpen} />
  if (section === "attendance") return <TeacherAttendance />
  if (section === "daily-update") return <TeacherDailyUpdate />
  if (section === "weekly-tests") return <TeacherWeeklyTests />
  if (section === "notices") return <TeacherUpdates />
  if (section === "marks") return <TeacherMarks />
  return <TeacherToday onOpen={onOpen} />
}
