import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { BadgeCheck, CloudUpload, Download, FileCheck2, FileSpreadsheet, History, Landmark, Plus, Trash2, UserCheck, Users, WalletCards } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog, EmptyState, Field, MetricCard, Pager, SearchField, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AdmissionWizard } from "@/features/management/admission-wizard"
import { FeeMonthTable, PrintReceiptButton, RecordPaymentForm } from "@/features/fees/components"
import { feeMonthsLabel } from "@/features/fees/receipts"
import { useSchool, studentName } from "@/data/store"
import { TODAY, isAttendancePresent, type Application, type MarkSheet, type Staff, type Student } from "@/data/types"
import { WEEKDAYS } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { monthLabel, outstanding } from "@/lib/fees"
import { classLabel, formatDate, gradeFromScore, pkr, timeAgo } from "@/lib/format"
import { can } from "@/lib/permissions"
import { useClientTable } from "@/lib/use-client-table"

const chartConfig = {
  students: { label: "Students", color: "var(--chart-1)" },
  collection: { label: "Collected", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-3)" },
} satisfies ChartConfig

function monthsThroughToday(start: string) {
  const keys: string[] = []
  let cursor = start.slice(0, 7)
  const end = TODAY.slice(0, 7)
  while (cursor <= end && keys.length < 12) {
    keys.push(cursor)
    const [year, month] = cursor.split("-").map(Number)
    cursor = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`
  }
  return keys
}

function queryMatch(query: string, parts: Array<string | number>) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return parts.join(" ").toLowerCase().includes(needle)
}

export function ManagementDashboard({ onOpen }: { onOpen: (section: string) => void }) {
  const { state } = useSchool()
  const currentSession = state.sessions.find((session) => session.current)
  const active = state.students.filter((student) => student.status === "Active").length
  const inactive = state.students.filter((student) => student.status !== "Active").length
  const teachers = state.staff.filter((person) => person.role.toLowerCase().includes("teacher")).length
  const presentToday = state.attendance.filter((mark) => mark.date === TODAY && isAttendancePresent(mark.status)).length
  const markedToday = state.attendance.filter((mark) => mark.date === TODAY).length
  // Overall fee totals: super admin only (UR-01). The dashboard is not mounted for other roles.
  const collectedThisMonth = state.payments.filter((payment) => payment.date.startsWith(TODAY.slice(0, 7)) && payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0)
  const unpaid = state.feeMonths.filter((month) => month.month <= TODAY.slice(0, 7)).reduce((sum, month) => sum + outstanding(month), 0)
  const enrollmentMonths = monthsThroughToday(currentSession?.start || TODAY)
  const openApps = state.applications.filter((item) => item.status === "New" || item.status === "Review").length
  const pendingMarks = state.sheets.filter((sheet) => sheet.status === "Draft" || sheet.status === "Submitted").length
  const classDistribution = state.classes.map((item) => ({
    class: item.label,
    students: state.students.filter((student) => student.classId === item.id && student.status === "Active").length,
  }))
  const enrollment = enrollmentMonths.map((month) => ({
    month: monthLabel(month).slice(0, 3),
    students: state.students.filter((student) => student.status === "Active" && student.admittedOn.slice(0, 7) <= month).length,
  }))
  const queue = [
    { count: openApps, title: "Applications to review", tag: "Admissions", section: "admissions" },
    { count: state.sheets.filter((sheet) => sheet.status === "Submitted").length, title: "Marks awaiting verification", tag: "Exams", section: "exams" },
    { count: state.payments.filter((payment) => payment.status === "Pending").length, title: "Unconfirmed payments", tag: "Fees", section: "fees" },
    { count: state.updates.filter((item) => item.status === "Draft" || item.status === "Approved").length, title: "Updates to publish", tag: "Messages", section: "messages" },
  ]

  return (
    <div className="grid gap-6">
      <Card className="border-[var(--primary-color)]/15 bg-[var(--secondary-color)]/60">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--primary-color)] uppercase">Academic summary</p>
            <p className="mt-1 text-[20px] font-semibold text-[var(--heading)]">{currentSession?.name ?? "No active session"}</p>
            <p className="text-sm text-muted-foreground">{currentSession ? `${currentSession.start} to ${currentSession.end}` : "Create a session in Academic setup."}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center sm:min-w-[280px]">
            <div><p className="text-2xl font-semibold text-[var(--primary-color)]">{state.classes.length}</p><p className="text-xs text-muted-foreground">Classes</p></div>
            <div><p className="text-2xl font-semibold text-[var(--primary-color)]">{state.subjects.length}</p><p className="text-xs text-muted-foreground">Subjects</p></div>
            <div><p className="text-2xl font-semibold text-[var(--primary-color)]">{teachers}</p><p className="text-xs text-muted-foreground">Teachers</p></div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Active students" value={active.toLocaleString("en-PK")} note={`${inactive} inactive / withdrawn`} tone="accent" />
        <MetricCard icon={UserCheck} label="Today’s attendance" value={markedToday ? `${Math.round((presentToday / markedToday) * 1000) / 10}%` : "—"} note={`${presentToday} present today`} />
        <MetricCard icon={WalletCards} label={`${monthLabel(TODAY.slice(0, 7))} collected`} value={pkr(collectedThisMonth)} note={`${pkr(unpaid)} still outstanding`} />
        <MetricCard icon={FileCheck2} label="Pending marks sheets" value={String(pendingMarks)} note={`${openApps} open admissions`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Enrollment growth</CardTitle><CardDescription>Current session student strength</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[245px] w-full">
              <AreaChart data={enrollment} margin={{ left: 0, right: 8, top: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="students" type="monotone" fill="var(--color-students)" fillOpacity={0.16} stroke="var(--color-students)" strokeWidth={2.5} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Attention queue</CardTitle><CardDescription>Items that need a decision</CardDescription></CardHeader>
          <CardContent className="grid gap-1">
            {queue.map((item) => (
              <button key={item.title} onClick={() => onOpen(item.section)} className="flex items-center gap-3 rounded-xl p-3 text-left hover:bg-muted">
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-semibold">{item.count}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.title}</span><span className="block text-xs text-muted-foreground">{item.tag}</span></span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Student distribution by class</CardTitle><CardDescription>Active students per section</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[245px] w-full">
              <BarChart data={classDistribution} margin={{ left: 0, right: 8, top: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="class" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="students" fill="var(--color-students)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fee position</CardTitle><CardDescription>Collected this month versus all monthly fees still due</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
              <span className="text-sm text-muted-foreground">Collected this month</span>
              <span className="font-semibold text-[var(--primary-color)]">{pkr(collectedThisMonth)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
              <span className="text-sm text-muted-foreground">Outstanding</span>
              <span className="font-semibold">{pkr(unpaid)}</span>
            </div>
            <Progress value={(collectedThisMonth + unpaid) ? Math.round((collectedThisMonth / (collectedThisMonth + unpaid)) * 100) : 0} className="h-2" />
            <p className="text-xs text-muted-foreground">{(collectedThisMonth + unpaid) ? Math.round((collectedThisMonth / (collectedThisMonth + unpaid)) * 100) : 0}% of tracked fee value is paid.</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Recent fee activity</CardTitle><CardDescription>Newest receipts in the ledger</CardDescription></div>
          <Button size="sm" onClick={() => onOpen("fees")}>Open fees</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Student</TableHead><TableHead>Fee months</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {state.payments.slice(0, 5).map((row) => (
                <TableRow key={row.ref}>
                  <TableCell className="font-mono text-xs">{row.ref}</TableCell>
                  <TableCell className="font-medium">{studentName(state.students, row.studentId)}</TableCell>
                  <TableCell>{feeMonthsLabel(row)}</TableCell>
                  <TableCell>{pkr(row.amount)}</TableCell>
                  <TableCell><StatusBadge value={row.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function AcademicSetup() {
  const { state, addSession, activateSession, addClass, addSubject, addSlot, removeSlot, addStaff, setClassPeriodCount } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const splat = params["*"] ?? ""
  const classFromUrl = splat.startsWith("classes/") ? splat.slice("classes/".length) : ""
  const [sessionForm, setSessionForm] = useState({ name: "", start: "", end: "" })
  const [classForm, setClassForm] = useState({ grade: "", section: "", room: "", periodCount: "8", monthlyFee: "8500" })
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" })
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", phone: "", subject: "", classIds: "" })
  const [editing, setEditing] = useState<Staff | null>(null)
  const [selectedClassId, setSelectedClassId] = useState("")
  const validUrlClass = classFromUrl && state.classes.some((item) => item.id === classFromUrl) ? classFromUrl : ""
  const classId = validUrlClass || selectedClassId || state.classes[0]?.id || ""
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const tab = selectedTab ?? (classFromUrl ? "timetable" : "sessions")
  const teachers = state.staff.filter((person) => person.role === "Teacher")
  const [slotForm, setSlotForm] = useState({ day: "Monday", time: "08:00", periodIndex: "1", teacherId: teachers[0]?.id ?? "", room: "Room 14" })
  const [error, setError] = useState("")
  const selectedClass = state.classes.find((item) => item.id === classId)
  const slotTeacher = teachers.find((person) => person.id === slotForm.teacherId)
  const visible = state.slots.filter((slot) => slot.classId === classId).sort((a, b) => WEEKDAYS.indexOf(a.day as (typeof WEEKDAYS)[number]) - WEEKDAYS.indexOf(b.day as (typeof WEEKDAYS)[number]) || a.periodIndex - b.periodIndex)
  const currentSession = state.sessions.find((session) => session.current)

  function selectClass(id: string) {
    setSelectedClassId(id)
    setSelectedTab("timetable")
    navigate(portalPath(actor.role, "academic", `classes/${id}`))
  }

  return (
    <Tabs value={tab} onValueChange={setSelectedTab} className="grid gap-5">
      <TabsList className="h-10 flex-wrap">
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="classes">Classes</TabsTrigger>
        <TabsTrigger value="subjects">Subjects</TabsTrigger>
        <TabsTrigger value="teachers">Teachers</TabsTrigger>
        <TabsTrigger value="timetable">Timetable</TabsTrigger>
      </TabsList>
      <TabsContent value="sessions" className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create session</CardTitle>
            <CardDescription>New sessions become current immediately so classes and admissions use them.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Session name"><Input value={sessionForm.name} onChange={(event) => setSessionForm({ ...sessionForm, name: event.target.value })} placeholder="2027–28" /></Field>
            <Field label="Start date"><Input type="date" value={sessionForm.start} onChange={(event) => setSessionForm({ ...sessionForm, start: event.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={sessionForm.end} onChange={(event) => setSessionForm({ ...sessionForm, end: event.target.value })} /></Field>
          </CardContent>
          <CardFooter>
            <Button onClick={() => {
              const message = addSession(sessionForm, actor.name)
              if (message) toast.error(message)
              else {
                toast.success("Session created and activated")
                setSessionForm({ name: "", start: "", end: "" })
              }
            }}>Create session</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Academic sessions</CardTitle>
            <CardDescription>{currentSession ? `Current: ${currentSession.name}` : "No active session yet."}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.name}</TableCell>
                    <TableCell>{session.start}</TableCell>
                    <TableCell>{session.end}</TableCell>
                    <TableCell>{session.current ? <Badge>Current</Badge> : <Badge variant="secondary">Archived</Badge>}</TableCell>
                    <TableCell>
                      {session.current ? null : (
                        <Button variant="outline" size="sm" onClick={() => {
                          const message = activateSession(session.id, actor.name)
                          if (message) toast.error(message)
                          else toast.success(`${session.name} is now current`)
                        }}>Activate</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="classes" className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle>Add section</CardTitle><CardDescription>Creates a class that admissions and timetables can use.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Grade"><Input value={classForm.grade} onChange={(event) => setClassForm({ ...classForm, grade: event.target.value })} placeholder="Grade 4" /></Field>
            <Field label="Section"><Input value={classForm.section} onChange={(event) => setClassForm({ ...classForm, section: event.target.value })} placeholder="Blue" /></Field>
            <Field label="Home room"><Input value={classForm.room} onChange={(event) => setClassForm({ ...classForm, room: event.target.value })} placeholder="Room 06" /></Field>
            <Field label="Periods / day"><Input value={classForm.periodCount} onChange={(event) => setClassForm({ ...classForm, periodCount: event.target.value })} placeholder="8" /></Field>
            <Field label="Monthly fee (PKR)" hint="Used when monthly fee records are generated."><Input value={classForm.monthlyFee} onChange={(event) => setClassForm({ ...classForm, monthlyFee: event.target.value })} placeholder="8500" /></Field>
          </CardContent>
          <CardFooter>
            <Button onClick={() => { const message = addClass({ ...classForm, periodCount: Number(classForm.periodCount) || 8, monthlyFee: Number(classForm.monthlyFee) || 0 }, actor.name); if (message) toast.error(message); else { toast.success("Class section added"); setClassForm({ grade: "", section: "", room: "", periodCount: "8", monthlyFee: "8500" }) } }}>Add class</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Room</TableHead><TableHead>Periods</TableHead><TableHead>Students</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {state.classes.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => selectClass(item.id)}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{item.room}</TableCell>
                    <TableCell>{item.periodCount ?? 8}</TableCell>
                    <TableCell>{state.students.filter((student) => student.classId === item.id && student.status === "Active").length}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Select value={String(item.periodCount ?? 8)} onValueChange={(value) => { const message = setClassPeriodCount(item.id, Number(value), actor.name); if (message) toast.error(message); else toast.success(`Periods set to ${value}`) }}>
                        <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>{[6, 7, 8, 9, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectGroup></SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="subjects" className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle>Add subject</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Name"><Input value={subjectForm.name} onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })} placeholder="Art" /></Field>
            <Field label="Code"><Input value={subjectForm.code} onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })} placeholder="ART" /></Field>
          </CardContent>
          <CardFooter><Button onClick={() => { const message = addSubject(subjectForm, actor.name); if (message) toast.error(message); else { toast.success("Subject added"); setSubjectForm({ name: "", code: "" }) } }}>Add subject</Button></CardFooter>
        </Card>
        <Card><CardContent className="grid gap-2 pt-4">{state.subjects.map((subject) => <div key={subject.id} className="flex items-center justify-between rounded-xl border px-4 py-3"><span className="font-medium">{subject.name}</span><span className="font-mono text-xs text-muted-foreground">{subject.code}</span></div>)}</CardContent></Card>
      </TabsContent>
      <TabsContent value="teachers" className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Assign teacher</CardTitle>
            <CardDescription>Every teacher has exactly one active subject. Classes are added as you build the timetable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Full name"><Input value={teacherForm.name} onChange={(event) => setTeacherForm({ ...teacherForm, name: event.target.value })} placeholder="Nadia Khan" /></Field>
            <Field label="Email"><Input value={teacherForm.email} onChange={(event) => setTeacherForm({ ...teacherForm, email: event.target.value })} placeholder="nadia@cls.edu.pk" /></Field>
            <Field label="Phone"><Input value={teacherForm.phone} onChange={(event) => setTeacherForm({ ...teacherForm, phone: event.target.value })} placeholder="03xx-xxxxxxx" /></Field>
            <Field label="Subject (required)" hint="Can be changed later; past records keep their subject."><Select value={teacherForm.subject} onValueChange={(subject) => setTeacherForm({ ...teacherForm, subject })}><SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger><SelectContent><SelectGroup>{state.subjects.map((subject) => <SelectItem key={subject.id} value={subject.name}>{subject.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Field label="Class IDs"><Input value={teacherForm.classIds} onChange={(event) => setTeacherForm({ ...teacherForm, classIds: event.target.value })} placeholder="g4b, g5g" /></Field>
          </CardContent>
          <CardFooter>
            <Button onClick={() => {
              const message = addStaff({
                name: teacherForm.name,
                role: "Teacher",
                email: teacherForm.email,
                phone: teacherForm.phone,
                subject: teacherForm.subject,
                classIds: teacherForm.classIds.split(",").map((item) => item.trim()).filter(Boolean),
              }, actor)
              if (message) toast.error(message)
              else {
                toast.success("Teacher assigned")
                setTeacherForm({ name: "", email: "", phone: "", subject: "", classIds: "" })
              }
            }}>Add teacher</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Active subject</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.subject}</TableCell>
                    <TableCell>{person.classIds.map((id) => state.classes.find((item) => item.id === id)?.label ?? id).join(", ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{person.email}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setEditing(person)}><History data-icon="inline-start" />Subject</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TeacherSubjectDialog teacher={editing} onClose={() => setEditing(null)} />
      </TabsContent>
      <TabsContent value="timetable" className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle>Weekly periods</CardTitle><CardDescription>A class or a teacher can hold only one lesson per weekday and period.</CardDescription></div>
              <div className="w-full sm:w-56">
                <Select value={classId} onValueChange={selectClass}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
              </div>
            </CardHeader>
            <CardContent>
              {visible.length === 0 ? <EmptyState title="No periods yet" detail="Add a period for this class. Clashes are rejected before they are saved." /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Period</TableHead><TableHead>Time</TableHead><TableHead>Subject</TableHead><TableHead>Teacher</TableHead><TableHead>Room</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {visible.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>{slot.day}</TableCell><TableCell>P{slot.periodIndex}</TableCell><TableCell>{slot.time}</TableCell><TableCell className="font-medium">{slot.subject}</TableCell><TableCell>{slot.teacher}</TableCell><TableCell>{slot.room}</TableCell>
                        <TableCell><Button variant="ghost" size="icon-sm" onClick={() => removeSlot(slot.id, actor.name)}><Trash2 /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Add period</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Day"><Select value={slotForm.day} onValueChange={(day) => setSlotForm({ ...slotForm, day })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
              <Field label="Period">
                <Select value={slotForm.periodIndex} onValueChange={(periodIndex) => setSlotForm({ ...slotForm, periodIndex })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{Array.from({ length: selectedClass?.periodCount ?? 8 }, (_, index) => <SelectItem key={index} value={String(index + 1)}>Period {index + 1}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field label="Time"><Input value={slotForm.time} onChange={(event) => setSlotForm({ ...slotForm, time: event.target.value })} placeholder="08:00" /></Field>
              <Field label="Teacher" hint={slotTeacher ? `Teaches ${slotTeacher.subject}` : undefined}>
                <Select value={slotForm.teacherId} onValueChange={(teacherId) => setSlotForm({ ...slotForm, teacherId })}>
                  <SelectTrigger><SelectValue placeholder="Choose teacher" /></SelectTrigger>
                  <SelectContent><SelectGroup>{teachers.map((person) => <SelectItem key={person.id} value={person.id}>{person.name} · {person.subject}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field label="Room" error={error}><Input value={slotForm.room} aria-invalid={Boolean(error)} onChange={(event) => setSlotForm({ ...slotForm, room: event.target.value })} /></Field>
            </CardContent>
            <CardFooter><Button onClick={() => { const message = addSlot({ day: slotForm.day, time: slotForm.time, room: slotForm.room, teacherId: slotForm.teacherId, classId, periodIndex: Number(slotForm.periodIndex) || 1 }, actor.name); setError(message ?? ""); if (!message) toast.success("Period scheduled") }}>Schedule</Button></CardFooter>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

export function Admissions({ query }: { query: string }) {
  const { state, setApplicationStatus, updateStudent } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const splat = params["*"] ?? ""
  const appFromUrl = splat.startsWith("applications/") ? splat.slice("applications/".length) : ""
  const studentFromUrl = splat.startsWith("students/") ? splat.slice("students/".length) : ""
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const tab = selectedTab ?? (studentFromUrl ? "students" : "applications")
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [classId, setClassId] = useState("all")
  const [open, setOpen] = useState(false)
  const selectedApp = useMemo(
    () => (appFromUrl ? state.applications.find((item) => item.id === appFromUrl) ?? null : null),
    [appFromUrl, state.applications]
  )
  const selectedStudent = useMemo(
    () => (studentFromUrl ? state.students.find((item) => item.id === studentFromUrl) ?? null : null),
    [studentFromUrl, state.students]
  )
  const [confirm, setConfirm] = useState<null | { id: string; status: Application["status"] }>(null)
  const search = localQuery || query

  function openApp(item: Application) {
    setSelectedTab("applications")
    navigate(portalPath(actor.role, "admissions", `applications/${item.id}`))
  }

  function openStudent(item: Student) {
    setSelectedTab("students")
    navigate(portalPath(actor.role, "admissions", `students/${item.id}`))
  }

  function closeDetails() {
    navigate(portalPath(actor.role, "admissions"))
  }

  const applications = state.applications.filter((item) => (status === "all" || item.status === status) && (classId === "all" || item.classId === classId) && queryMatch(search, [item.id, item.name, item.guardian, classLabel(state.classes, item.classId)]))
  const students = state.students.filter((item) => (status === "all" || item.status === status) && (classId === "all" || item.classId === classId) && queryMatch(search, [item.id, item.name, item.guardian, classLabel(state.classes, item.classId)]))
  const appTable = useClientTable(applications, `${search}|${status}|${classId}|apps`)
  const studentTable = useClientTable(students, `${search}|${status}|${classId}|students`)

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={FileCheck2} label="Open applications" value={String(state.applications.filter((item) => item.status === "New" || item.status === "Review").length)} note="Waiting on the admissions desk" />
        <MetricCard icon={Users} label="Active students" value={String(state.students.filter((item) => item.status === "Active").length)} note="Enrolled in 2026–27" />
        <MetricCard icon={BadgeCheck} label="Enrolled from intake" value={String(state.applications.filter((item) => item.status === "Enrolled").length)} note="Applications converted to students" />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>{tab === "applications" ? "Applications" : "Student register"}</CardTitle><CardDescription>Search, filter and open a record to act on it.</CardDescription></div>
            <Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />New admission</Button>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchField value={localQuery} onChange={setLocalQuery} placeholder={query ? `Also matching “${query}”` : "Search name, ID or guardian"} />
            <div className="grid grid-cols-2 gap-3 sm:w-[360px]">
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All statuses</SelectItem>{["New", "Review", "Waitlist", "Enrolled", "Rejected", "Active", "Pending", "Withdrawn"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select>
              <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All classes</SelectItem>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
            </div>
          </div>
          <Tabs value={tab} onValueChange={setSelectedTab}><TabsList><TabsTrigger value="applications">Applications</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger></TabsList></Tabs>
        </CardHeader>
        <CardContent>
          {tab === "applications" ? (
            appTable.total === 0 ? <EmptyState title="No applications" detail="Adjust the filters or create a new admission." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Applicant</TableHead><TableHead>Class</TableHead><TableHead>Guardian</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {appTable.slice.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => openApp(item)}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{classLabel(state.classes, item.classId)}</TableCell>
                      <TableCell>{item.guardian}</TableCell>
                      <TableCell>{formatDate(item.submittedOn)}</TableCell>
                      <TableCell><StatusBadge value={item.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : studentTable.total === 0 ? <EmptyState title="No students" detail="No register rows match these filters." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead><TableHead>Guardian</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {studentTable.slice.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => openStudent(item)}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{classLabel(state.classes, item.classId)}</TableCell>
                    <TableCell>{item.guardian}</TableCell>
                    <TableCell><StatusBadge value={item.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pager {...(tab === "applications" ? appTable : studentTable)} onPage={(tab === "applications" ? appTable : studentTable).setPage} />
      </Card>

      <AdmissionWizard open={open} onOpenChange={setOpen} />

      <Dialog open={Boolean(selectedApp)} onOpenChange={(value) => !value && closeDetails()}>
        <DialogContent className="sm:max-w-lg">
          {selectedApp ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[20px] text-[var(--heading)]">{selectedApp.name}</DialogTitle>
                <DialogDescription>{selectedApp.id} · {classLabel(state.classes, selectedApp.classId)} · {selectedApp.gender}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <p><span className="text-muted-foreground">Guardian:</span> {selectedApp.guardian} ({selectedApp.guardianRelation || "Guardian"}) · {selectedApp.phone}</p>
                <p><span className="text-muted-foreground">Address:</span> {selectedApp.address || "—"}</p>
                <p><span className="text-muted-foreground">Previous school:</span> {selectedApp.previousSchool || "—"}{selectedApp.previousClass ? ` · ${selectedApp.previousClass}` : ""}</p>
                <p><span className="text-muted-foreground">Interview:</span> {selectedApp.interviewType || "—"}{selectedApp.interviewScore ? ` · score ${selectedApp.interviewScore}` : ""}{selectedApp.interviewResult ? ` · ${selectedApp.interviewResult}` : ""}</p>
                <p><span className="text-muted-foreground">Decision:</span> {selectedApp.decision || "Pending"}</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedApp.documents || []).map((doc) => (
                    <span key={doc.id} className="rounded-full border px-2.5 py-1 text-xs">{doc.label}: {doc.status}</span>
                  ))}
                </div>
                <p className="text-muted-foreground">{selectedApp.notes || "No admission notes yet."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setApplicationStatus(selectedApp.id, "Review", actor.name); toast.success("Moved to review") }}>Mark in review</Button>
                <Button variant="secondary" onClick={() => setConfirm({ id: selectedApp.id, status: "Waitlist" })}>Waitlist</Button>
                <Button onClick={() => setConfirm({ id: selectedApp.id, status: "Enrolled" })}>Enroll</Button>
                <Button variant="destructive" onClick={() => setConfirm({ id: selectedApp.id, status: "Rejected" })}>Reject</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedStudent)} onOpenChange={(value) => !value && closeDetails()}>
        <DialogContent>
          {selectedStudent ? (
            <>
              <DialogHeader><DialogTitle>{selectedStudent.name}</DialogTitle><DialogDescription>{selectedStudent.id} · {classLabel(state.classes, selectedStudent.classId)} · DOB {formatDate(selectedStudent.dob)}</DialogDescription></DialogHeader>
              <div className="grid gap-3 text-sm"><p>Guardian: {selectedStudent.guardian}</p><p>Phone: {selectedStudent.phone}</p><StatusBadge value={selectedStudent.status} /></div>
              {can(actor.role, "fees.status.view") ? <div className="max-h-64 overflow-y-auto rounded-xl border"><FeeMonthTable studentId={selectedStudent.id} /></div> : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => { updateStudent(selectedStudent.id, { status: "Active" }, actor.name); toast.success("Student marked active"); closeDetails() }}>Mark active</Button>
                <Button variant="destructive" onClick={() => { updateStudent(selectedStudent.id, { status: "Withdrawn" }, actor.name); toast.success("Student withdrawn"); closeDetails() }}>Withdraw</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.status === "Enrolled" ? "Enroll this applicant?" : confirm?.status === "Waitlist" ? "Move to waitlist?" : "Reject this application?"}
        description={confirm?.status === "Enrolled" ? "A student record will be created if one does not already exist." : confirm?.status === "Waitlist" ? "The applicant stays in the queue without a student record." : "The family will no longer appear in the open queue."}
        confirmLabel={confirm?.status === "Enrolled" ? "Enroll" : confirm?.status === "Waitlist" ? "Waitlist" : "Reject"}
        destructive={confirm?.status === "Rejected"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return
          const message = setApplicationStatus(confirm.id, confirm.status, actor.name)
          if (message) toast.error(message)
          else toast.success(confirm.status === "Enrolled" ? "Student enrolled" : confirm.status === "Waitlist" ? "Moved to waitlist" : "Application rejected")
          setConfirm(null)
          closeDetails()
        }}
      />
    </div>
  )
}

/** Change a teacher's single active subject; the previous assignment is closed, never rewritten (UR-02). */
function TeacherSubjectDialog({ teacher, onClose }: { teacher: Staff | null; onClose: () => void }) {
  const { state, changeTeacherSubject } = useSchool()
  const actor = useActor()
  const [subject, setSubject] = useState("")
  const [reason, setReason] = useState("")
  const current = teacher ? state.staff.find((person) => person.id === teacher.id) ?? teacher : null
  const allowed = can(actor.role, "teachers.subject.change")

  function close() {
    setSubject("")
    setReason("")
    onClose()
  }

  return (
    <Dialog open={Boolean(current)} onOpenChange={(value) => !value && close()}>
      <DialogContent>
        {current ? (
          <>
            <DialogHeader><DialogTitle>{current.name} · {current.subject}</DialogTitle><DialogDescription>One active subject at a time. Lessons, tests and marks already recorded keep the subject they were recorded under.</DialogDescription></DialogHeader>
            <div className="grid gap-2">
              {[...current.subjectHistory].reverse().map((row) => (
                <div key={`${row.subject}-${row.from}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                  <div><p className="font-medium">{row.subject}</p><p className="text-xs text-muted-foreground">{formatDate(row.from)} → {row.to ? formatDate(row.to) : "present"} · {row.by}{row.reason ? ` · ${row.reason}` : ""}</p></div>
                  {row.to ? <Badge variant="secondary">Closed</Badge> : <Badge>Active</Badge>}
                </div>
              ))}
            </div>
            {allowed ? (
              <div className="grid gap-3">
                <Field label="New subject"><Select value={subject} onValueChange={setSubject}><SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger><SelectContent><SelectGroup>{state.subjects.filter((item) => item.name !== current.subject).map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                <Field label="Reason"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why the subject is changing" /></Field>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={close}>Close</Button>
              {allowed ? <Button disabled={!subject} onClick={() => { const message = changeTeacherSubject(current.id, subject, reason, actor); if (message) toast.error(message); else { toast.success(`${current.name} now teaches ${subject}`); close() } }}>Change subject</Button> : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function People({ query }: { query: string }) {
  const { state, addStaff } = useSchool()
  const actor = useActor()
  const roleOptions = can(actor.role, "staff.create.any") ? ["Teacher", "Operations Manager", "Accountant"] : ["Teacher"]
  const [localQuery, setLocalQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const emptyForm = { name: "", role: "Teacher", email: "", phone: "", subject: "" }
  const [form, setForm] = useState(emptyForm)
  const search = localQuery || query
  const rows = state.staff.filter((person) => queryMatch(search, [person.name, person.role, person.email, person.subject]))
  const table = useClientTable(rows, search)

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Staff directory</CardTitle><CardDescription>Teachers carry one active subject; office roles have portal access only to their own work.</CardDescription></div><Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />{roleOptions.length > 1 ? "Add staff" : "Add teacher"}</Button></div>
        <SearchField value={localQuery} onChange={setLocalQuery} placeholder="Search staff" />
      </CardHeader>
      <CardContent>
        {table.total === 0 ? <EmptyState title="No staff found" detail="Try another name or role." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Subject</TableHead><TableHead>Classes</TableHead><TableHead>Email</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {table.slice.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.role}</TableCell>
                  <TableCell>{person.subject || "—"}</TableCell>
                  <TableCell>{person.classIds.map((id) => classLabel(state.classes, id)).join(", ") || "—"}</TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>{person.role === "Teacher" ? <Button size="sm" variant="outline" onClick={() => setEditing(person)}><History data-icon="inline-start" />Subject</Button> : null}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Pager {...table} onPage={table.setPage} />
      <TeacherSubjectDialog teacher={editing} onClose={() => setEditing(null)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add staff member</DialogTitle><DialogDescription>A teacher cannot be created without a subject.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Role"><Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{roleOptions.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@cls.edu.pk" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            {form.role === "Teacher" ? <Field label="Subject (required)"><Select value={form.subject} onValueChange={(subject) => setForm({ ...form, subject })}><SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger><SelectContent><SelectGroup>{state.subjects.map((subject) => <SelectItem key={subject.id} value={subject.name}>{subject.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { const message = addStaff({ ...form, classIds: [] }, actor); if (message) toast.error(message); else { toast.success("Staff member added"); setOpen(false); setForm(emptyForm) } }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function Examinations() {
  const { state, setSheetStatus } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const sheetFromUrl = params["*"] ?? ""
  const current = useMemo(
    () => (sheetFromUrl ? state.sheets.find((sheet) => sheet.id === sheetFromUrl) ?? null : null),
    [sheetFromUrl, state.sheets]
  )
  const [status, setStatus] = useState("all")
  const rows = state.sheets.filter((sheet) => status === "all" || sheet.status === status)

  function openSheet(sheet: MarkSheet) {
    navigate(portalPath(actor.role, "exams", sheet.id))
  }

  function closeSheet() {
    navigate(portalPath(actor.role, "exams"))
  }

  return (
    <div className="grid gap-5">
      <SectionHeading title="Examinations" detail="Draft, submitted, verified, then published. Publishing never checks fees — parent visibility is decided at view time." action={<div className="w-48"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All statuses</SelectItem>{["Draft", "Submitted", "Verified", "Published"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div>} />
      <div className="grid gap-3">
        {rows.map((sheet) => {
          const entered = sheet.rows.filter((row) => row.score !== null).length
          const progress = sheet.rows.length ? Math.round((entered / sheet.rows.length) * 100) : 0
          return (
            <Card key={sheet.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                <div><p className="font-medium">{sheet.examName}</p><p className="text-xs text-muted-foreground">{classLabel(state.classes, sheet.classId)} · {sheet.subject}</p></div>
                <div><p className="text-xs text-muted-foreground">Entered</p><p className="text-sm font-medium">{entered}/{sheet.rows.length}</p></div>
                <Progress value={progress} />
                <div className="flex items-center gap-2"><StatusBadge value={sheet.status} /><Button variant="outline" size="sm" onClick={() => openSheet(sheet)}>Open</Button></div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={Boolean(current)} onOpenChange={(value) => !value && closeSheet()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {current ? (
            <>
              <DialogHeader><DialogTitle>{current.subject}</DialogTitle><DialogDescription>{current.examName} · {classLabel(state.classes, current.classId)} · max {current.max}</DialogDescription></DialogHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                <TableBody>
                  {current.rows.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>{studentName(state.students, row.studentId)}</TableCell>
                      <TableCell>{row.score ?? "—"}</TableCell>
                      <TableCell>{row.score === null ? "—" : gradeFromScore(row.score, current.max)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DialogFooter>
                {current.status === "Submitted" ? <Button variant="outline" onClick={() => { const message = setSheetStatus(current.id, "Verified", actor.name); if (message) toast.error(message); else toast.success("Sheet verified") }}>Verify</Button> : null}
                {current.status === "Verified" ? <Button onClick={() => { const message = setSheetStatus(current.id, "Published", actor.name); if (message) toast.error(message); else toast.success("Results published to parents") }}>Publish</Button> : null}
                {current.status !== "Draft" ? <Button variant="destructive" onClick={() => { const message = setSheetStatus(current.id, "Draft", actor.name); if (message) toast.error(message); else toast.success("Sheet reopened") }}>Reopen</Button> : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Super admin fee desk: overall totals, the full ledger and offline sync (UR-01 / UR-08). */
export function Fees({ query }: { query: string }) {
  const { state, confirmPayment, importWorkbook } = useSchool()
  const actor = useActor()
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [payOpen, setPayOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [ledgerOf, setLedgerOf] = useState("")
  const [fileName, setFileName] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<string[]>([])
  const search = localQuery || query
  const rows = state.payments.filter((payment) => (status === "all" || payment.status === status) && queryMatch(search, [payment.ref, payment.studentId, studentName(state.students, payment.studentId), feeMonthsLabel(payment), payment.recordedBy]))
  const table = useClientTable(rows, `${search}|${status}`)
  const feeData = useMemo(() => monthsThroughToday(state.sessions.find((session) => session.current)?.start || TODAY).map((key) => ({
    month: monthLabel(key).slice(0, 3),
    collection: Math.round(state.payments.filter((payment) => payment.date.startsWith(key) && payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0) / 1000),
    target: Math.round(state.feeMonths.filter((month) => month.month === key).reduce((sum, month) => sum + month.amountDue, 0) / 1000),
  })), [state.feeMonths, state.payments, state.sessions])

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Collection against target</CardTitle><CardDescription>Paid receipts in thousands of rupees</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={feeData}><CartesianGrid vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="collection" fill="var(--color-collection)" radius={[6, 6, 0, 0]} /><Bar dataKey="target" fill="var(--color-target)" opacity={0.25} radius={[6, 6, 0, 0]} /></BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-accent/25 bg-accent/6">
          <CardHeader>
            <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"><FileSpreadsheet className="size-5" /></div>
            <CardTitle className="mt-4">Offline fee desk</CardTitle>
            <CardDescription>Upload the controlled workbook. Each row carries an idempotency key, so re-imported rows are skipped and reported.</CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => toast.success("Fee template downloaded")}><Download data-icon="inline-start" />Template</Button>
            <Button className="flex-1" onClick={() => { setReport([]); setSyncOpen(true) }}><CloudUpload data-icon="inline-start" />Upload</Button>
          </CardFooter>
        </Card>
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Ledger</CardTitle><CardDescription>Every receipt, who recorded it and the fee months it cleared.</CardDescription></div><Button onClick={() => setPayOpen(true)}><Plus data-icon="inline-start" />Record payment</Button></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField value={localQuery} onChange={setLocalQuery} placeholder="Search receipt, student or month" />
            <div className="sm:w-44"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectGroup></SelectContent></Select></div>
          </div>
        </CardHeader>
        <CardContent>
          {table.total === 0 ? <EmptyState title="No payments" detail="Record a payment or change the filter." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Fee months</TableHead><TableHead>Amount</TableHead><TableHead>Recorded by</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {table.slice.map((payment) => (
                  <TableRow key={payment.ref}>
                    <TableCell className="font-mono text-xs">{payment.ref}</TableCell>
                    <TableCell><button className="text-left font-medium hover:underline" onClick={() => setLedgerOf(payment.studentId)}>{studentName(state.students, payment.studentId)}</button><p className="text-xs text-muted-foreground">{payment.studentId}</p></TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{feeMonthsLabel(payment)}{payment.mode === "manual" ? <Badge variant="secondary" className="ml-2">manual</Badge> : null}</TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell>{payment.recordedBy}</TableCell>
                    <TableCell><StatusBadge value={payment.status} /></TableCell>
                    <TableCell>{payment.status === "Pending" ? <Button size="sm" variant="outline" onClick={() => { const message = confirmPayment(payment.ref, actor); if (message) toast.error(message); else toast.success("Payment confirmed and allocated") }}>Confirm</Button> : <PrintReceiptButton payment={payment} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pager {...table} onPage={table.setPage} />
      </Card>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Record fee payment</DialogTitle><DialogDescription>A receipt number is generated. The oldest unpaid month is cleared first unless you record an explicit allocation.</DialogDescription></DialogHeader>
          <RecordPaymentForm onRecorded={() => setPayOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(ledgerOf)} onOpenChange={(value) => !value && setLedgerOf("")}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{studentName(state.students, ledgerOf)}</DialogTitle><DialogDescription>Monthly fee records for {ledgerOf}</DialogDescription></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto"><FeeMonthTable studentId={ledgerOf} /></div>
        </DialogContent>
      </Dialog>
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Synchronise offline fees</DialogTitle><DialogDescription>Every row is validated. Duplicates stay out of the ledger.</DialogDescription></DialogHeader>
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 p-6 text-center">
            <CloudUpload className="size-5" />
            <span className="mt-3 text-sm font-medium">{fileName || "Choose .xlsx workbook"}</span>
            <Input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
          </label>
          {syncing ? <p className="text-sm text-muted-foreground">Validating rows…</p> : null}
          {report.length ? <Alert><AlertTitle>Import report</AlertTitle><AlertDescription><ul className="mt-2 list-disc pl-4">{report.map((line) => <li key={line}>{line}</li>)}</ul></AlertDescription></Alert> : null}
          <DialogFooter><Button variant="outline" onClick={() => setSyncOpen(false)}>Close</Button><Button disabled={syncing} onClick={() => { setSyncing(true); window.setTimeout(() => { const result = importWorkbook(fileName, actor); setSyncing(false); if (typeof result === "string") toast.error(result); else { setReport([`${result.imported} imported`, `${result.skipped} skipped`, `${result.failed} failed`, ...result.notes]); toast.success("Workbook processed") } }, 700) }}>Validate & import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Finance() {
  const { state, addExpense } = useSchool()
  const actor = useActor()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: "", category: "Facilities", amount: "", date: TODAY })
  const income = state.payments.filter((payment) => payment.status === "Paid" && payment.date.startsWith("2026-09")).reduce((sum, payment) => sum + payment.amount, 0)
  const spent = state.expenses.filter((expense) => expense.date.startsWith("2026-09")).reduce((sum, expense) => sum + expense.amount, 0)
  const categories = ["Payroll", "Facilities", "Academic supplies", "Transport", "Other"]
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Post expense</Button></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={WalletCards} label="September income" value={pkr(income)} note="Paid fees this month" tone="accent" />
        <MetricCard icon={Landmark} label="September expenses" value={pkr(spent)} note={`${state.expenses.length} ledger lines`} />
        <MetricCard icon={FileSpreadsheet} label="Net position" value={pkr(income - spent)} note="Income minus posted expenses" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Expense categories</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            {categories.map((category) => {
              const amount = state.expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0)
              const width = spent ? Math.round((amount / spent) * 100) : 0
              return <div key={category}><div className="mb-2 flex justify-between text-sm"><span>{category}</span><span className="font-medium">{pkr(amount)}</span></div><Progress value={width} /></div>
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest entries</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {state.expenses.slice(0, 6).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between rounded-xl border px-3 py-3"><div><p className="text-sm font-medium">{expense.title}</p><p className="text-xs text-muted-foreground">{expense.category} · {formatDate(expense.date)}</p></div><span className="text-sm font-semibold">− {pkr(expense.amount)}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post expense</DialogTitle><DialogDescription>This updates the September operating position.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
            <Field label="Category"><Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Field label="Amount"><Input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { const message = addExpense({ ...form, amount: Number(form.amount) }, actor); if (message) toast.error(message); else { toast.success("Expense posted"); setOpen(false); setForm({ ...form, title: "", amount: "" }) } }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function MessagesDesk() {
  const { state, setUpdateStatus } = useSchool()
  const actor = useActor()
  const [filter, setFilter] = useState("all")
  const rows = state.updates.filter((item) => filter === "all" || item.status === filter)
  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><div className="w-44"><Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All</SelectItem>{["Draft", "Approved", "Published", "Rejected"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div></div>
      {rows.length === 0 ? <EmptyState title="No updates" detail="Teacher drafts will show up here for approval." /> : rows.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><StatusBadge value={item.kind} /><StatusBadge value={item.status} /></div><span className="text-xs text-muted-foreground">{classLabel(state.classes, item.classId)} · {item.author}</span></div>
            <CardTitle className="text-base">{item.subject}</CardTitle>
            <CardDescription className="text-sm text-foreground/80">{item.text}</CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            {item.status === "Draft" ? <Button size="sm" variant="outline" onClick={() => { setUpdateStatus(item.id, "Approved", actor.name); toast.success("Update approved") }}>Approve</Button> : null}
            {item.status === "Approved" || item.status === "Draft" ? <Button size="sm" onClick={() => { setUpdateStatus(item.id, "Published", actor.name); toast.success("Visible to parents") }}>Publish</Button> : null}
            {item.status !== "Rejected" && item.status !== "Published" ? <Button size="sm" variant="destructive" onClick={() => { setUpdateStatus(item.id, "Rejected", actor.name); toast.success("Update rejected") }}>Reject</Button> : null}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function Reports() {
  const { state } = useSchool()
  const actor = useActor()
  const [preview, setPreview] = useState<string | null>(null)
  const financial = can(actor.role, "fees.totals")
  const catalogs = [
    { id: "enrollment", title: "Enrollment register", detail: "Class strength from the live register" },
    { id: "attendance", title: "Attendance summary", detail: `Marks recorded for ${formatDate(TODAY)}` },
    ...(financial ? [{ id: "fees", title: "Fee outstanding", detail: "Pending receipts still to confirm" }, { id: "sync", title: "Offline sync log", detail: "Imported, skipped and failed rows" }] : []),
    { id: "exams", title: "Exam analytics", detail: "Mark sheet progress by status" },
  ]
  return (
    <Tabs defaultValue="reports">
      <TabsList><TabsTrigger value="reports">Report library</TabsTrigger><TabsTrigger value="audit">Audit trail</TabsTrigger></TabsList>
      <TabsContent value="reports" className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {catalogs.map((item) => (
          <Card key={item.id} className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => setPreview(item.id)}>
            <CardHeader><div className="flex justify-between"><span className="grid size-10 place-items-center rounded-xl bg-muted"><Download className="size-4" /></span></div><CardTitle className="mt-4">{item.title}</CardTitle><CardDescription>{item.detail}</CardDescription></CardHeader>
          </Card>
        ))}
      </TabsContent>
      <TabsContent value="audit" className="mt-5">
        <Card>
          <CardHeader><CardTitle>Security audit trail</CardTitle><CardDescription>Sensitive actions recorded in this browser session.</CardDescription></CardHeader>
          <CardContent className="grid gap-1">
            {state.audits.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
                <div><p className="text-sm"><span className="font-semibold">{event.actor}</span> {event.action}</p><p className="text-xs text-muted-foreground">{timeAgo(event.at)}</p></div>
                <Badge variant="outline">{event.entity?.replace(/_/g, " ") ?? "recorded"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <Dialog open={Boolean(preview)} onOpenChange={(value) => !value && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{catalogs.find((item) => item.id === preview)?.title}</DialogTitle><DialogDescription>Generated from the current dummy ledger.</DialogDescription></DialogHeader>
          <div className="grid gap-2 text-sm">
            {preview === "enrollment" && state.classes.map((item) => <div key={item.id} className="flex justify-between border-b py-2"><span>{item.label}</span><span>{state.students.filter((student) => student.classId === item.id && student.status === "Active").length}</span></div>)}
            {preview === "attendance" && <p>{state.attendance.filter((mark) => mark.date === TODAY && isAttendancePresent(mark.status)).length} present on {formatDate(TODAY)}.</p>}
            {preview === "fees" && state.payments.filter((payment) => payment.status === "Pending").map((payment) => <div key={payment.ref} className="flex justify-between border-b py-2"><span>{payment.ref}</span><span>{pkr(payment.amount)}</span></div>)}
            {preview === "exams" && state.sheets.map((sheet) => <div key={sheet.id} className="flex justify-between border-b py-2"><span>{sheet.subject}</span><StatusBadge value={sheet.status} /></div>)}
            {preview === "sync" && state.syncLogs.map((log) => <div key={log.id} className="border-b py-2">{log.fileName}: {log.imported} imported, {log.skipped} skipped, {log.failed} failed</div>)}
          </div>
          <DialogFooter><Button onClick={() => toast.success("Report file prepared")}>Download</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
