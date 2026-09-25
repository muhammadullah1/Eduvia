import { useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { BadgeCheck, CloudUpload, Download, FileCheck2, FileSpreadsheet, Landmark, Plus, Trash2, UserCheck, Users, WalletCards } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog, EmptyState, Field, MetricCard, Pager, SearchField, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { useSchool, studentName } from "@/data/store"
import type { Application, MarkSheet, Student } from "@/data/types"
import { classLabel, formatDate, gradeFromScore, pkr, timeAgo } from "@/lib/format"
import { useClientTable } from "@/lib/use-client-table"

const chartConfig = {
  students: { label: "Students", color: "var(--chart-1)" },
  collection: { label: "Collected", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-3)" },
} satisfies ChartConfig

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
const monthKeys = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]

function queryMatch(query: string, parts: Array<string | number>) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return parts.join(" ").toLowerCase().includes(needle)
}

export function ManagementDashboard({ onOpen }: { onOpen: (section: string) => void }) {
  const { state } = useSchool()
  const active = state.students.filter((student) => student.status === "Active").length
  const presentToday = state.attendance.filter((mark) => mark.date === "2026-09-23" && mark.status === "Present").length
  const markedToday = state.attendance.filter((mark) => mark.date === "2026-09-23").length
  const september = state.payments.filter((payment) => payment.period.startsWith("September") && payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0)
  const openApps = state.applications.filter((item) => item.status === "New" || item.status === "Review").length
  const enrollment = months.map((month, index) => ({ month, students: index === months.length - 1 ? active : 1180 + index * 14 }))
  const queue = [
    { count: openApps, title: "Applications to review", tag: "Admissions", section: "admissions" },
    { count: state.sheets.filter((sheet) => sheet.status === "Submitted").length, title: "Marks awaiting verification", tag: "Exams", section: "exams" },
    { count: state.payments.filter((payment) => payment.status === "Pending").length, title: "Unconfirmed payments", tag: "Fees", section: "fees" },
    { count: state.updates.filter((item) => item.status === "Draft" || item.status === "Approved").length, title: "Updates to publish", tag: "Messages", section: "messages" },
  ]

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Active students" value={active.toLocaleString("en-PK")} note="Current session register" tone="accent" />
        <MetricCard icon={UserCheck} label="Today’s attendance" value={markedToday ? `${Math.round((presentToday / markedToday) * 1000) / 10}%` : "—"} note={`${presentToday} present today`} />
        <MetricCard icon={WalletCards} label="September collected" value={pkr(september)} note="Paid receipts only" />
        <MetricCard icon={FileCheck2} label="Open admissions" value={String(openApps)} note="New or in review" />
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
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Recent fee activity</CardTitle><CardDescription>Newest receipts in the ledger</CardDescription></div>
          <Button size="sm" onClick={() => onOpen("fees")}>Open fees</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Student</TableHead><TableHead>Fee</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {state.payments.slice(0, 5).map((row) => (
                <TableRow key={row.ref}>
                  <TableCell className="font-mono text-xs">{row.ref}</TableCell>
                  <TableCell className="font-medium">{studentName(state.students, row.studentId)}</TableCell>
                  <TableCell>{row.type} · {row.period}</TableCell>
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
  const { state, addClass, addSubject, addSlot, removeSlot } = useSchool()
  const [classForm, setClassForm] = useState({ grade: "", section: "", room: "" })
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" })
  const [classId, setClassId] = useState(state.classes[0]?.id ?? "")
  const [slotForm, setSlotForm] = useState({ day: "Monday", time: "08:00", subject: "Mathematics", teacher: "Hassan Ali", room: "Room 14" })
  const [error, setError] = useState("")
  const visible = state.slots.filter((slot) => slot.classId === classId).sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time))

  return (
    <Tabs defaultValue="classes" className="grid gap-5">
      <TabsList className="h-10">
        <TabsTrigger value="classes">Classes</TabsTrigger>
        <TabsTrigger value="subjects">Subjects</TabsTrigger>
        <TabsTrigger value="timetable">Timetable</TabsTrigger>
      </TabsList>
      <TabsContent value="classes" className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle>Add section</CardTitle><CardDescription>Creates a class that admissions and timetables can use.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Grade"><Input value={classForm.grade} onChange={(event) => setClassForm({ ...classForm, grade: event.target.value })} placeholder="Grade 4" /></Field>
            <Field label="Section"><Input value={classForm.section} onChange={(event) => setClassForm({ ...classForm, section: event.target.value })} placeholder="Blue" /></Field>
            <Field label="Home room"><Input value={classForm.room} onChange={(event) => setClassForm({ ...classForm, room: event.target.value })} placeholder="Room 06" /></Field>
          </CardContent>
          <CardFooter>
            <Button onClick={() => { const message = addClass(classForm, "Ayesha Khan"); if (message) toast.error(message); else { toast.success("Class section added"); setClassForm({ grade: "", section: "", room: "" }) } }}>Add class</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Room</TableHead><TableHead>Students</TableHead></TableRow></TableHeader>
              <TableBody>
                {state.classes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{item.room}</TableCell>
                    <TableCell>{state.students.filter((student) => student.classId === item.id && student.status === "Active").length}</TableCell>
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
          <CardFooter><Button onClick={() => { const message = addSubject(subjectForm, "Ayesha Khan"); if (message) toast.error(message); else { toast.success("Subject added"); setSubjectForm({ name: "", code: "" }) } }}>Add subject</Button></CardFooter>
        </Card>
        <Card><CardContent className="grid gap-2 pt-4">{state.subjects.map((subject) => <div key={subject.id} className="flex items-center justify-between rounded-xl border px-4 py-3"><span className="font-medium">{subject.name}</span><span className="font-mono text-xs text-muted-foreground">{subject.code}</span></div>)}</CardContent></Card>
      </TabsContent>
      <TabsContent value="timetable" className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle>Weekly periods</CardTitle><CardDescription>Conflict checks cover class, teacher and room.</CardDescription></div>
              <div className="w-full sm:w-56">
                <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
              </div>
            </CardHeader>
            <CardContent>
              {visible.length === 0 ? <EmptyState title="No periods yet" detail="Add a period for this class. Clashes are rejected before they are saved." /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Time</TableHead><TableHead>Subject</TableHead><TableHead>Teacher</TableHead><TableHead>Room</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {visible.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>{slot.day}</TableCell><TableCell>{slot.time}</TableCell><TableCell className="font-medium">{slot.subject}</TableCell><TableCell>{slot.teacher}</TableCell><TableCell>{slot.room}</TableCell>
                        <TableCell><Button variant="ghost" size="icon-sm" onClick={() => removeSlot(slot.id, "Ayesha Khan")}><Trash2 /></Button></TableCell>
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
              <Field label="Time"><Input value={slotForm.time} onChange={(event) => setSlotForm({ ...slotForm, time: event.target.value })} placeholder="08:00" /></Field>
              <Field label="Subject"><Input value={slotForm.subject} onChange={(event) => setSlotForm({ ...slotForm, subject: event.target.value })} /></Field>
              <Field label="Teacher"><Input value={slotForm.teacher} onChange={(event) => setSlotForm({ ...slotForm, teacher: event.target.value })} /></Field>
              <Field label="Room" error={error}><Input value={slotForm.room} aria-invalid={Boolean(error)} onChange={(event) => setSlotForm({ ...slotForm, room: event.target.value })} /></Field>
            </CardContent>
            <CardFooter><Button onClick={() => { const message = addSlot({ ...slotForm, classId }, "Ayesha Khan"); setError(message ?? ""); if (!message) toast.success("Period scheduled") }}>Schedule</Button></CardFooter>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

export function Admissions({ query }: { query: string }) {
  const { state, addApplication, setApplicationStatus, updateStudent } = useSchool()
  const [tab, setTab] = useState("applications")
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [classId, setClassId] = useState("all")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", dob: "", classId: state.classes[0]?.id ?? "", guardian: "", phone: "", notes: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [confirm, setConfirm] = useState<null | { id: string; status: Application["status"] }>(null)
  const search = localQuery || query

  const applications = state.applications.filter((item) => (status === "all" || item.status === status) && (classId === "all" || item.classId === classId) && queryMatch(search, [item.id, item.name, item.guardian, classLabel(state.classes, item.classId)]))
  const students = state.students.filter((item) => (status === "all" || item.status === status) && (classId === "all" || item.classId === classId) && queryMatch(search, [item.id, item.name, item.guardian, classLabel(state.classes, item.classId)]))
  const appTable = useClientTable(applications, `${search}|${status}|${classId}|apps`)
  const studentTable = useClientTable(students, `${search}|${status}|${classId}|students`)

  function submitApplication() {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = "Student name is required."
    if (!form.dob) next.dob = "Date of birth is required."
    if (!form.guardian.trim()) next.guardian = "Guardian name is required."
    if (!form.phone.trim()) next.phone = "Phone is required."
    setErrors(next)
    if (Object.keys(next).length) return
    const message = addApplication(form, "Ayesha Khan")
    if (message) toast.error(message)
    else {
      toast.success("Application created")
      setOpen(false)
      setForm({ name: "", dob: "", classId: state.classes[0]?.id ?? "", guardian: "", phone: "", notes: "" })
    }
  }

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
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All statuses</SelectItem>{["New", "Review", "Enrolled", "Rejected", "Active", "Pending", "Withdrawn"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select>
              <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All classes</SelectItem>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
            </div>
          </div>
          <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="applications">Applications</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger></TabsList></Tabs>
        </CardHeader>
        <CardContent>
          {tab === "applications" ? (
            appTable.total === 0 ? <EmptyState title="No applications" detail="Adjust the filters or create a new admission." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Applicant</TableHead><TableHead>Class</TableHead><TableHead>Guardian</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {appTable.slice.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelectedApp(item)}>
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
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => setSelectedStudent(item)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Create new admission</DialogTitle><DialogDescription>The application starts as New and can be reviewed before enrollment.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Student name" error={errors.name}><Input aria-invalid={Boolean(errors.name)} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Date of birth" error={errors.dob}><Input aria-invalid={Boolean(errors.dob)} type="date" value={form.dob} onChange={(event) => setForm({ ...form, dob: event.target.value })} /></Field>
            <Field label="Applying for"><Select value={form.classId} onValueChange={(value) => setForm({ ...form, classId: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Field label="Guardian" error={errors.guardian}><Input aria-invalid={Boolean(errors.guardian)} value={form.guardian} onChange={(event) => setForm({ ...form, guardian: event.target.value })} /></Field>
            <Field label="Phone" error={errors.phone}><Input aria-invalid={Boolean(errors.phone)} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Interview, documents or special notes" /></Field></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submitApplication}>Save application</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedApp)} onOpenChange={(value) => !value && setSelectedApp(null)}>
        <DialogContent>
          {selectedApp ? (
            <>
              <DialogHeader><DialogTitle>{selectedApp.name}</DialogTitle><DialogDescription>{selectedApp.id} · {classLabel(state.classes, selectedApp.classId)} · Guardian {selectedApp.guardian}</DialogDescription></DialogHeader>
              <p className="text-sm text-muted-foreground">{selectedApp.notes || "No admission notes yet."}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setApplicationStatus(selectedApp.id, "Review", "Ayesha Khan"); setSelectedApp({ ...selectedApp, status: "Review" }); toast.success("Moved to review") }}>Mark in review</Button>
                <Button onClick={() => setConfirm({ id: selectedApp.id, status: "Enrolled" })}>Enroll</Button>
                <Button variant="destructive" onClick={() => setConfirm({ id: selectedApp.id, status: "Rejected" })}>Reject</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedStudent)} onOpenChange={(value) => !value && setSelectedStudent(null)}>
        <DialogContent>
          {selectedStudent ? (
            <>
              <DialogHeader><DialogTitle>{selectedStudent.name}</DialogTitle><DialogDescription>{selectedStudent.id} · {classLabel(state.classes, selectedStudent.classId)} · DOB {formatDate(selectedStudent.dob)}</DialogDescription></DialogHeader>
              <div className="grid gap-3 text-sm"><p>Guardian: {selectedStudent.guardian}</p><p>Phone: {selectedStudent.phone}</p><StatusBadge value={selectedStudent.status} /></div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { updateStudent(selectedStudent.id, { status: "Active" }, "Ayesha Khan"); toast.success("Student marked active"); setSelectedStudent(null) }}>Mark active</Button>
                <Button variant="destructive" onClick={() => { updateStudent(selectedStudent.id, { status: "Withdrawn" }, "Ayesha Khan"); toast.success("Student withdrawn"); setSelectedStudent(null) }}>Withdraw</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.status === "Enrolled" ? "Enroll this applicant?" : "Reject this application?"} description={confirm?.status === "Enrolled" ? "A student record will be created if one does not already exist." : "The family will no longer appear in the open queue."} confirmLabel={confirm?.status === "Enrolled" ? "Enroll" : "Reject"} destructive={confirm?.status === "Rejected"} onClose={() => setConfirm(null)} onConfirm={() => { if (!confirm) return; const message = setApplicationStatus(confirm.id, confirm.status, "Ayesha Khan"); if (message) toast.error(message); else toast.success(confirm.status === "Enrolled" ? "Student enrolled" : "Application rejected"); setConfirm(null); setSelectedApp(null) }} />
    </div>
  )
}

export function People({ query }: { query: string }) {
  const { state, addStaff } = useSchool()
  const [localQuery, setLocalQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", role: "Teacher", email: "", phone: "", subjects: "English", classIds: [] as string[] })
  const search = localQuery || query
  const rows = state.staff.filter((person) => queryMatch(search, [person.name, person.role, person.email, person.subjects.join(" ")]))
  const table = useClientTable(rows, search)

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Staff directory</CardTitle><CardDescription>Teachers and office staff used by timetables and portals.</CardDescription></div><Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Add staff</Button></div>
        <SearchField value={localQuery} onChange={setLocalQuery} placeholder="Search staff" />
      </CardHeader>
      <CardContent>
        {table.total === 0 ? <EmptyState title="No staff found" detail="Try another name or role." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Subjects</TableHead><TableHead>Classes</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
            <TableBody>
              {table.slice.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.role}</TableCell>
                  <TableCell>{person.subjects.join(", ") || "—"}</TableCell>
                  <TableCell>{person.classIds.map((id) => classLabel(state.classes, id)).join(", ") || "—"}</TableCell>
                  <TableCell>{person.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Pager {...table} onPage={table.setPage} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add staff member</DialogTitle><DialogDescription>They appear in the directory immediately. Assignment can be refined later.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Role"><Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["Teacher", "Accounts", "Coordinator"].map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@cls.edu.pk" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="Subjects"><Input value={form.subjects} onChange={(event) => setForm({ ...form, subjects: event.target.value })} placeholder="Comma separated" /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { const message = addStaff({ ...form, subjects: form.subjects.split(",").map((item) => item.trim()).filter(Boolean), classIds: [] }, "Ayesha Khan"); if (message) toast.error(message); else { toast.success("Staff member added"); setOpen(false) } }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function Examinations() {
  const { state, setSheetStatus } = useSchool()
  const [active, setActive] = useState<MarkSheet | null>(null)
  const [status, setStatus] = useState("all")
  const rows = state.sheets.filter((sheet) => status === "all" || sheet.status === status)
  const current = active ? state.sheets.find((sheet) => sheet.id === active.id) ?? null : null

  return (
    <div className="grid gap-5">
      <SectionHeading title="Examinations" detail="Draft, submitted, verified, then published. Parents only see published results." action={<div className="w-48"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All statuses</SelectItem>{["Draft", "Submitted", "Verified", "Published"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div>} />
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
                <div className="flex items-center gap-2"><StatusBadge value={sheet.status} /><Button variant="outline" size="sm" onClick={() => setActive(sheet)}>Open</Button></div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={Boolean(current)} onOpenChange={(value) => !value && setActive(null)}>
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
                {current.status === "Submitted" ? <Button variant="outline" onClick={() => { const message = setSheetStatus(current.id, "Verified", "Ayesha Khan"); if (message) toast.error(message); else toast.success("Sheet verified") }}>Verify</Button> : null}
                {current.status === "Verified" ? <Button onClick={() => { const message = setSheetStatus(current.id, "Published", "Ayesha Khan"); if (message) toast.error(message); else toast.success("Results published to parents") }}>Publish</Button> : null}
                {current.status !== "Draft" ? <Button variant="destructive" onClick={() => { const message = setSheetStatus(current.id, "Draft", "Ayesha Khan"); if (message) toast.error(message); else toast.success("Sheet reopened") }}>Reopen</Button> : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Fees({ query }: { query: string }) {
  const { state, addPayment, setPaymentStatus, importWorkbook } = useSchool()
  const [localQuery, setLocalQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [payOpen, setPayOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [report, setReport] = useState<string[]>([])
  const [form, setForm] = useState({ studentId: "", period: "September 2026", type: "Tuition", amount: "8500", method: "Cash", ref: "" })
  const [error, setError] = useState("")
  const search = localQuery || query
  const rows = state.payments.filter((payment) => (status === "all" || payment.status === status) && queryMatch(search, [payment.ref, studentName(state.students, payment.studentId), payment.period, payment.type]))
  const table = useClientTable(rows, `${search}|${status}`)
  const feeData = useMemo(() => monthKeys.map((key, index) => ({
    month: months[index],
    collection: Math.round(state.payments.filter((payment) => payment.date.startsWith(key) && payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0) / 1000),
    target: 120,
  })), [state.payments])

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
            <CardDescription>Upload the controlled workbook. Existing receipt references are skipped and reported.</CardDescription>
          </CardHeader>
          <CardFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => toast.success("Fee template downloaded")}><Download data-icon="inline-start" />Template</Button>
            <Button className="flex-1" onClick={() => { setReport([]); setSyncOpen(true) }}><CloudUpload data-icon="inline-start" />Upload</Button>
          </CardFooter>
        </Card>
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Ledger</CardTitle><CardDescription>Duplicate receipt references cannot be saved.</CardDescription></div><Button onClick={() => { setError(""); setPayOpen(true) }}><Plus data-icon="inline-start" />Record payment</Button></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField value={localQuery} onChange={setLocalQuery} placeholder="Search receipt or student" />
            <div className="sm:w-44"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectGroup></SelectContent></Select></div>
          </div>
        </CardHeader>
        <CardContent>
          {table.total === 0 ? <EmptyState title="No payments" detail="Record a payment or change the filter." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Student</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {table.slice.map((payment) => (
                  <TableRow key={payment.ref}>
                    <TableCell className="font-mono text-xs">{payment.ref}</TableCell>
                    <TableCell>{studentName(state.students, payment.studentId)}</TableCell>
                    <TableCell>{payment.type} · {payment.period}</TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell><StatusBadge value={payment.status} /></TableCell>
                    <TableCell>{payment.status === "Pending" ? <Button size="sm" variant="outline" onClick={() => { setPaymentStatus(payment.ref, "Paid", "Nadia Iqbal"); toast.success("Payment confirmed") }}>Confirm</Button> : null}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <Pager {...table} onPage={table.setPage} />
      </Card>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record fee payment</DialogTitle><DialogDescription>The receipt reference must be unique across the ledger.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Student" error={error}><Select value={form.studentId} onValueChange={(studentId) => setForm({ ...form, studentId })}><SelectTrigger aria-invalid={Boolean(error)}><SelectValue placeholder="Choose student" /></SelectTrigger><SelectContent><SelectGroup>{state.students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name} · {student.id}</SelectItem>)}</SelectGroup></SelectContent></Select></Field></div>
            <Field label="Period"><Select value={form.period} onValueChange={(period) => setForm({ ...form, period })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["September 2026", "October 2026"].map((period) => <SelectItem key={period} value={period}>{period}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <Field label="Amount"><Input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
            <Field label="Method"><Select value={form.method} onValueChange={(method) => setForm({ ...form, method })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank transfer">Bank transfer</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field label="Receipt reference"><Input value={form.ref} onChange={(event) => setForm({ ...form, ref: event.target.value })} placeholder="RCPT-1026-500" /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button><Button onClick={() => { const message = addPayment({ ...form, amount: Number(form.amount), ref: form.ref }, "Nadia Iqbal"); if (message) { setError(message); toast.error(message) } else { toast.success("Payment recorded"); setPayOpen(false); setForm({ ...form, ref: "" }) } }}>Save payment</Button></DialogFooter>
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
          <DialogFooter><Button variant="outline" onClick={() => setSyncOpen(false)}>Close</Button><Button disabled={syncing} onClick={() => { setSyncing(true); window.setTimeout(() => { const result = importWorkbook(fileName, "Nadia Iqbal"); setSyncing(false); if (typeof result === "string") toast.error(result); else { setReport([`${result.imported} imported`, `${result.skipped} skipped`, `${result.failed} failed`, ...result.notes]); toast.success("Workbook processed") } }, 700) }}>Validate & import</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function Finance() {
  const { state, addExpense } = useSchool()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: "", category: "Facilities", amount: "", date: "2026-09-23" })
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
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => { const message = addExpense({ ...form, amount: Number(form.amount) }, "Ayesha Khan"); if (message) toast.error(message); else { toast.success("Expense posted"); setOpen(false); setForm({ ...form, title: "", amount: "" }) } }}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function MessagesDesk() {
  const { state, setUpdateStatus } = useSchool()
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
            {item.status === "Draft" ? <Button size="sm" variant="outline" onClick={() => { setUpdateStatus(item.id, "Approved", "Ayesha Khan"); toast.success("Update approved") }}>Approve</Button> : null}
            {item.status === "Approved" || item.status === "Draft" ? <Button size="sm" onClick={() => { setUpdateStatus(item.id, "Published", "Ayesha Khan"); toast.success("Visible to parents") }}>Publish</Button> : null}
            {item.status !== "Rejected" && item.status !== "Published" ? <Button size="sm" variant="destructive" onClick={() => { setUpdateStatus(item.id, "Rejected", "Ayesha Khan"); toast.success("Update rejected") }}>Reject</Button> : null}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function Reports({ onReset }: { onReset: () => void }) {
  const { state } = useSchool()
  const [preview, setPreview] = useState<string | null>(null)
  const catalogs = [
    { id: "enrollment", title: "Enrollment register", detail: "Class strength from the live register" },
    { id: "attendance", title: "Attendance summary", detail: "Marks recorded for 23 September" },
    { id: "fees", title: "Fee outstanding", detail: "Pending receipts still to confirm" },
    { id: "exams", title: "Exam analytics", detail: "Mark sheet progress by status" },
    { id: "sync", title: "Offline sync log", detail: "Imported, skipped and failed rows" },
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
        <Card><CardHeader><CardTitle>Reset demo data</CardTitle><CardDescription>Restores the original sample school if you want a clean walkthrough.</CardDescription></CardHeader><CardFooter><Button variant="outline" onClick={onReset}>Reset</Button></CardFooter></Card>
      </TabsContent>
      <TabsContent value="audit" className="mt-5">
        <Card>
          <CardHeader><CardTitle>Security audit trail</CardTitle><CardDescription>Sensitive actions recorded in this browser session.</CardDescription></CardHeader>
          <CardContent className="grid gap-1">
            {state.audits.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
                <div><p className="text-sm"><span className="font-semibold">{event.actor}</span> {event.action}</p><p className="text-xs text-muted-foreground">{timeAgo(event.at)}</p></div>
                <StatusBadge value="Recorded" />
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
            {preview === "attendance" && <p>{state.attendance.filter((mark) => mark.date === "2026-09-23" && mark.status === "Present").length} present on 23 September.</p>}
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
