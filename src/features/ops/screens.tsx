import { useMemo, useState } from "react"
import { BookOpen, CalendarClock, ClipboardCheck, ClipboardList, Flag, Printer, ShieldAlert, UserCheck, Users } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Field, MetricCard, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { FeeMonthTable, PrintReceiptButton, RecordPaymentForm } from "@/features/fees/components"
import { feeMonthsLabel } from "@/features/fees/receipts"
import { studentName, useSchool } from "@/data/store"
import { TODAY, type DailyTestRules, type Payment, type ResultFeeRule, type ReviewStatus, type TeacherAbsence, type WeeklyTest } from "@/data/types"
import { activeOverride, availableSubstitutes, busyReason, feeCleared, monthlySummaries, resultVisibility, WEEKDAYS, weekdayOf } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { monthLabel } from "@/lib/fees"
import { classLabel, formatDate, pkr, timeAgo } from "@/lib/format"
import { can } from "@/lib/permissions"
import { printDocument } from "@/lib/print"

const CURRENT_MONTH = TODAY.slice(0, 7)

function useStaffName() {
  const { state } = useSchool()
  return (id: string) => state.staff.find((person) => person.id === id)?.name ?? id
}

// ---- accountant (UR-08 / §9) ----------------------------------------------------

/** Accountant portal: record payments and see only your own receipts. No totals anywhere. */
export function AccountantPortal({ section }: { section: string }) {
  if (section === "collections") return <MyCollections />
  return <CollectDesk />
}

function CollectDesk() {
  const { state, confirmPayment } = useSchool()
  const actor = useActor()
  const [last, setLast] = useState<Payment | null>(null)
  const [lookup, setLookup] = useState("")
  const pending = state.payments.filter((payment) => payment.status === "Pending")
  const current = last ? state.payments.find((payment) => payment.ref === last.ref) ?? last : null

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader><CardTitle>Record payment</CardTitle><CardDescription>A receipt number is generated. The oldest unpaid month is always cleared first.</CardDescription></CardHeader>
        <CardContent><RecordPaymentForm onRecorded={setLast} /></CardContent>
      </Card>
      <div className="grid content-start gap-5">
        {current ? (
          <Card className="border-[var(--primary-color)]/20">
            <CardHeader><CardTitle>Receipt {current.ref}</CardTitle><CardDescription>{studentName(state.students, current.studentId)} · {current.studentId}</CardDescription></CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p>Fee months: <span className="font-medium">{feeMonthsLabel(current)}</span></p>
              <p>Amount received: <span className="font-medium">{pkr(current.amount)}</span> · {current.method}</p>
              <p className="text-muted-foreground">{formatDate(current.date)} · recorded by {current.recordedBy}</p>
            </CardContent>
            <CardFooter><PrintReceiptButton payment={current} /></CardFooter>
          </Card>
        ) : null}
        <Card>
          <CardHeader><CardTitle>Student fee status</CardTitle><CardDescription>Month-by-month status before you collect.</CardDescription></CardHeader>
          <CardContent className="grid gap-3">
            <Select value={lookup} onValueChange={setLookup}>
              <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
              <SelectContent><SelectGroup>{state.students.filter((student) => student.status === "Active").map((student) => <SelectItem key={student.id} value={student.id}>{student.name} · {student.id}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            {lookup ? <div className="max-h-72 overflow-y-auto"><FeeMonthTable studentId={lookup} /></div> : null}
          </CardContent>
        </Card>
        {pending.length ? (
          <Card>
            <CardHeader><CardTitle>Bank transfers to confirm</CardTitle><CardDescription>Confirming allocates the transfer oldest month first.</CardDescription></CardHeader>
            <CardContent className="grid gap-2">
              {pending.map((payment) => (
                <div key={payment.ref} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm">
                  <div><p className="font-medium">{studentName(state.students, payment.studentId)}</p><p className="text-xs text-muted-foreground">{payment.ref} · {formatDate(payment.date)} · {pkr(payment.amount)}</p></div>
                  <Button size="sm" variant="outline" onClick={() => { const message = confirmPayment(payment.ref, actor); if (message) toast.error(message); else toast.success("Transfer confirmed") }}>Confirm</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function MyCollections() {
  const { state } = useSchool()
  const actor = useActor()
  const [day, setDay] = useState(TODAY)
  // Only this accountant's own confirmed receipts for the chosen day, no aggregates (§9.2).
  const rows = state.payments.filter((payment) => payment.recordedBy === actor.name && payment.status === "Paid" && payment.date === day)

  function printDay() {
    const opened = printDocument(`Daily receipts · ${formatDate(day)}`, [`Recorded by: ${actor.name}`], {
      columns: ["Student", "Admission ID", "Payment date", "Fee months", "Amount", "Receipt no."],
      rows: rows.map((payment) => [studentName(state.students, payment.studentId), payment.studentId, formatDate(payment.date), feeMonthsLabel(payment), pkr(payment.amount), payment.ref]),
    })
    if (!opened) toast.error("Allow pop-ups to print the day sheet.")
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><CardTitle>My receipts</CardTitle><CardDescription>Only payments you recorded. Totals are kept by the super admin.</CardDescription></div>
          <div className="flex items-end gap-2">
            <Field label="Day"><Input type="date" value={day} max={TODAY} onChange={(event) => setDay(event.target.value || TODAY)} /></Field>
            <Button variant="outline" disabled={!rows.length} onClick={printDay}><Printer data-icon="inline-start" />Print day</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <EmptyState title="No receipts" detail={`You did not record any payments on ${formatDate(day)}.`} /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Admission ID</TableHead><TableHead>Payment date</TableHead><TableHead>Fee months</TableHead><TableHead>Amount</TableHead><TableHead>Receipt no.</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((payment) => (
                <TableRow key={payment.ref}>
                  <TableCell className="font-medium">{studentName(state.students, payment.studentId)}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.studentId}</TableCell>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>{feeMonthsLabel(payment)}</TableCell>
                  <TableCell>{pkr(payment.amount)}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.ref}</TableCell>
                  <TableCell><PrintReceiptButton payment={payment} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

// ---- operations overview ---------------------------------------------------------

/** Operations manager landing page. Deliberately shows no fee amounts (UR-01). */
export function OperationsOverview({ onOpen }: { onOpen: (section: string) => void }) {
  const { state } = useSchool()
  const active = state.students.filter((student) => student.status === "Active").length
  const marked = state.attendance.filter((mark) => mark.date === TODAY)
  const present = marked.filter((mark) => mark.status === "Present").length
  const pendingCover = state.teacherAbsences.filter((row) => row.date === TODAY && row.status === "Pending").length
  const toReview = state.dailyLessons.filter((row) => row.reviewStatus === "Submitted").length
  const toPublish = state.weeklyTests.filter((test) => test.status === "MarksEntered").length
  const flagged = monthlySummaries(state.weeklyTests, CURRENT_MONTH, state.settings.dailyTestRules).filter((row) => row.flaggedForFollowUp)
  const queue = [
    { count: pendingCover, title: "Absent periods without cover today", section: "absences" },
    { count: toReview, title: "Daily updates awaiting review", section: "lesson-review" },
    { count: toPublish, title: "Weekly tests ready to publish", section: "weekly-tests" },
    { count: state.sheets.filter((sheet) => sheet.status === "Submitted").length, title: "Mark sheets awaiting verification", section: "exams" },
    { count: state.applications.filter((item) => item.status === "New" || item.status === "Review").length, title: "Applications to review", section: "admissions" },
  ]

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Active students" value={String(active)} note={`${state.classes.length} class sections`} tone="accent" />
        <MetricCard icon={UserCheck} label="Today’s attendance" value={marked.length ? `${Math.round((present / marked.length) * 100)}%` : "—"} note={`${present} present`} />
        <MetricCard icon={CalendarClock} label="Periods needing cover" value={String(pendingCover)} note="Today" />
        <MetricCard icon={Flag} label="Flagged this month" value={String(flagged.length)} note="Failed a subject (weekly tests)" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Attention queue</CardTitle><CardDescription>Academic operations that need a decision</CardDescription></CardHeader>
          <CardContent className="grid gap-1">
            {queue.map((item) => (
              <button key={item.title} onClick={() => onOpen(item.section)} className="flex items-center gap-3 rounded-xl p-3 text-left hover:bg-muted">
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-semibold">{item.count}</span>
                <span className="text-sm font-medium">{item.title}</span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Follow-up list · {monthLabel(CURRENT_MONTH)}</CardTitle><CardDescription>More than {state.settings.dailyTestRules.maxFailsPerMonth} failed weekly test(s) in a subject</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {flagged.length === 0 ? <p className="text-sm text-muted-foreground">No students flagged.</p> : flagged.map((row) => (
              <div key={`${row.studentId}-${row.subject}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span><span className="font-medium">{studentName(state.students, row.studentId)}</span> · {row.subject} · {classLabel(state.classes, row.classId)}</span>
                <StatusBadge value="Failed" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---- absences & substitutes (UR-03 / §5) --------------------------------------------

export function AbsencesPanel() {
  const { state, markTeacherAbsent, assignSubstitute, removeSubstitute, cancelAbsence } = useSchool()
  const actor = useActor()
  const nameOf = useStaffName()
  const teachers = state.staff.filter((person) => person.role === "Teacher")
  const [teacherId, setTeacherId] = useState("")
  const [date, setDate] = useState(TODAY)
  const [periods, setPeriods] = useState<number[]>([])
  const [notes, setNotes] = useState("")
  const [viewDate, setViewDate] = useState(TODAY)
  const [picking, setPicking] = useState<TeacherAbsence | null>(null)
  const teacher = teachers.find((person) => person.id === teacherId)
  const periodCount = Math.max(...state.classes.filter((klass) => teacher?.classIds.includes(klass.id)).map((klass) => klass.periodCount), 8)
  const teaching = state.slots.filter((slot) => slot.teacherId === teacherId && slot.day === weekdayOf(date))
  const dayRows = state.teacherAbsences.filter((row) => row.date === viewDate).sort((a, b) => nameOf(a.teacherId).localeCompare(nameOf(b.teacherId)) || a.periodIndex - b.periodIndex)
  const current = picking ? state.teacherAbsences.find((row) => row.id === picking.id) ?? null : null
  const free = current ? availableSubstitutes(current, state.staff, state.slots, state.substitutions, state.teacherAbsences) : []
  const busy = current ? teachers.filter((person) => person.id !== current.teacherId && !free.includes(person)) : []

  function toggle(period: number) {
    setPeriods((list) => (list.includes(period) ? list.filter((item) => item !== period) : [...list, period].sort((a, b) => a - b)))
  }

  function submit() {
    const message = markTeacherAbsent({ teacherId, date, periods, notes }, actor)
    if (message) toast.error(message)
    else {
      toast.success("Absence recorded — assign cover for each teaching period")
      setViewDate(date)
      setPeriods([])
      setNotes("")
    }
  }

  function assign(substituteId: string) {
    if (!current) return
    const message = assignSubstitute(current.id, substituteId, actor)
    if (message) toast.error(message)
    else {
      toast.success(`${nameOf(substituteId)} assigned`)
      setPicking(null)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card className="self-start">
        <CardHeader><CardTitle>Mark teacher absent</CardTitle><CardDescription>Choose the periods; each teaching period gets its own cover decision.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Teacher"><Select value={teacherId} onValueChange={(value) => { setTeacherId(value); setPeriods([]) }}><SelectTrigger><SelectValue placeholder="Choose teacher" /></SelectTrigger><SelectContent><SelectGroup>{teachers.map((person) => <SelectItem key={person.id} value={person.id}>{person.name} · {person.subject}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          {teacher ? (
            <Field label={`Periods · ${weekdayOf(date)}`} hint="Highlighted periods have a class in the timetable.">
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: periodCount }, (_, index) => index + 1).map((period) => {
                  const slot = teaching.find((item) => item.periodIndex === period)
                  return (
                    <label key={period} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${slot ? "border-[var(--primary-color)]/40 bg-[var(--secondary-color)]/50" : ""}`}>
                      <Checkbox checked={periods.includes(period)} onCheckedChange={() => toggle(period)} />P{period}
                    </label>
                  )
                })}
              </div>
            </Field>
          ) : null}
          {teacher ? <Button variant="outline" size="sm" onClick={() => setPeriods(Array.from({ length: periodCount }, (_, index) => index + 1))}>Whole day</Button> : null}
          <Field label="Notes"><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Medical leave" /></Field>
        </CardContent>
        <CardFooter><Button disabled={!teacherId || !periods.length} onClick={submit}>Mark absent</Button></CardFooter>
      </Card>

      <div className="grid content-start gap-5">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><CardTitle>Absences · {formatDate(viewDate)}</CardTitle><CardDescription>Free teachers are found from the timetable and today’s other substitutions.</CardDescription></div>
            <Input type="date" className="sm:w-44" value={viewDate} onChange={(event) => setViewDate(event.target.value || TODAY)} />
          </CardHeader>
          <CardContent>
            {dayRows.length === 0 ? <EmptyState title="No absences" detail="Nobody is marked absent on this date." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Period</TableHead><TableHead>Class · subject</TableHead><TableHead>Status</TableHead><TableHead>Substitute</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {dayRows.map((row) => {
                    const sub = state.substitutions.find((item) => item.absenceId === row.id)
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{nameOf(row.teacherId)}</TableCell>
                        <TableCell>P{row.periodIndex}</TableCell>
                        <TableCell>{row.classId ? `${classLabel(state.classes, row.classId)} · ${row.subject}` : "Free period"}</TableCell>
                        <TableCell><StatusBadge value={row.status === "NoClass" ? "No class" : row.status} /></TableCell>
                        <TableCell>{sub ? <span>{nameOf(sub.substituteTeacherId)}<span className="block text-xs text-muted-foreground">by {sub.authorizedBy}</span></span> : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {row.status === "Pending" ? <Button size="sm" onClick={() => setPicking(row)}>Find cover</Button> : null}
                            {row.status === "Covered" ? <Button size="sm" variant="outline" onClick={() => { const message = removeSubstitute(row.id, actor); if (message) toast.error(message); else toast.success("Substitute removed") }}>Remove cover</Button> : null}
                            {row.status !== "Cancelled" ? <Button size="sm" variant="ghost" onClick={() => { const message = cancelAbsence(row.id, actor); if (message) toast.error(message); else toast.success("Absence cancelled") }}>Cancel</Button> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Substitution register</CardTitle><CardDescription>Date, period, original teacher, substitute, class, subject and who authorised it.</CardDescription></CardHeader>
          <CardContent>
            {state.substitutions.length === 0 ? <p className="text-sm text-muted-foreground">No substitutions yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Period</TableHead><TableHead>Class · subject</TableHead><TableHead>Original</TableHead><TableHead>Substitute</TableHead><TableHead>Authorised by</TableHead></TableRow></TableHeader>
                <TableBody>
                  {state.substitutions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.date)}</TableCell><TableCell>P{row.periodIndex}</TableCell><TableCell>{classLabel(state.classes, row.classId)} · {row.subject}</TableCell>
                      <TableCell>{nameOf(row.originalTeacherId)}</TableCell><TableCell className="font-medium">{nameOf(row.substituteTeacherId)}</TableCell><TableCell>{row.authorizedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(current)} onOpenChange={(value) => !value && setPicking(null)}>
        <DialogContent>
          {current ? (
            <>
              <DialogHeader><DialogTitle>Cover · period {current.periodIndex}</DialogTitle><DialogDescription>{classLabel(state.classes, current.classId ?? "")} · {current.subject} · {weekdayOf(current.date)} {formatDate(current.date)} · for {nameOf(current.teacherId)}</DialogDescription></DialogHeader>
              <div className="grid gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Free at this period</p>
                {free.length === 0 ? <p className="text-sm text-muted-foreground">No teacher is free in this period.</p> : free.map((person) => (
                  <div key={person.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                    <span><span className="font-medium">{person.name}</span> · {person.subject}</span>
                    <Button size="sm" onClick={() => assign(person.id)}>Assign</Button>
                  </div>
                ))}
                {busy.length ? <p className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Busy — the system rejects these</p> : null}
                {busy.map((person) => (
                  <div key={person.id} className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    <span>{person.name} · {busyReason(person.id, current.date, current.periodIndex, state.slots, state.substitutions.filter((row) => row.absenceId !== current.id), state.teacherAbsences)}</span>
                    <Button size="sm" variant="ghost" onClick={() => assign(person.id)}>Try</Button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- planned chapters (UR-04) ------------------------------------------------------

function ClassSubjectPicker({ classId, subject, onClass, onSubject }: { classId: string; subject: string; onClass: (id: string) => void; onSubject: (name: string) => void }) {
  const { state } = useSchool()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select value={classId} onValueChange={onClass}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent><SelectGroup>{state.classes.map((klass) => <SelectItem key={klass.id} value={klass.id}>{klass.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
      <Select value={subject} onValueChange={onSubject}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectGroup>{state.subjects.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select>
    </div>
  )
}

export function CurriculumPanel() {
  const { state, addPlannedChapter, removePlannedChapter } = useSchool()
  const actor = useActor()
  const [classId, setClassId] = useState("g7b")
  const [subject, setSubject] = useState("Mathematics")
  const [form, setForm] = useState({ title: "", targetDate: "", description: "" })
  const chapters = state.plannedChapters.filter((row) => row.classId === classId && row.subject === subject).sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader className="gap-3"><CardTitle>Planned chapters</CardTitle><CardDescription>Teachers pick from this list when posting a daily update.</CardDescription><ClassSubjectPicker classId={classId} subject={subject} onClass={setClassId} onSubject={setSubject} /></CardHeader>
        <CardContent>
          {chapters.length === 0 ? <EmptyState title="No chapters planned" detail="Add the first chapter for this class and subject." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Chapter</TableHead><TableHead>Target</TableHead><TableHead>Daily updates</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {chapters.map((chapter) => {
                  const updates = state.dailyLessons.filter((lesson) => lesson.chapterId === chapter.id)
                  return (
                    <TableRow key={chapter.id}>
                      <TableCell>{chapter.sequence}</TableCell>
                      <TableCell><p className="font-medium">{chapter.title}</p>{chapter.description ? <p className="text-xs text-muted-foreground">{chapter.description}</p> : null}</TableCell>
                      <TableCell>{chapter.targetDate ? formatDate(chapter.targetDate) : "—"}</TableCell>
                      <TableCell>{updates.length ? `${updates.filter((lesson) => lesson.reviewStatus === "Approved").length} approved / ${updates.length}` : "—"}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" disabled={updates.length > 0} onClick={() => { const message = removePlannedChapter(chapter.id, actor); if (message) toast.error(message); else toast.success("Chapter removed") }}>Remove</Button></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardHeader><CardTitle>Add chapter</CardTitle><CardDescription>{classLabel(state.classes, classId)} · {subject}</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Chapter 7 — Data handling" /></Field>
          <Field label="Target date"><Input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        </CardContent>
        <CardFooter><Button onClick={() => { const message = addPlannedChapter({ classId, subject, title: form.title, targetDate: form.targetDate || undefined, description: form.description || undefined }, actor); if (message) toast.error(message); else { toast.success("Chapter planned"); setForm({ title: "", targetDate: "", description: "" }) } }}>Add chapter</Button></CardFooter>
      </Card>
    </div>
  )
}

// ---- lesson review (UR-04) ------------------------------------------------------------

export function LessonReviewPanel() {
  const { state, reviewDailyLesson } = useSchool()
  const actor = useActor()
  const [filter, setFilter] = useState<ReviewStatus | "all">("Submitted")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const rows = state.dailyLessons.filter((row) => filter === "all" || row.reviewStatus === filter).sort((a, b) => b.date.localeCompare(a.date))

  function decide(id: string, decision: "Approved" | "Rejected") {
    const message = reviewDailyLesson(id, decision, notes[id] ?? "", actor)
    if (message) toast.error(message)
    else toast.success(decision === "Approved" ? "Approved — now visible to parents" : "Returned to the teacher")
  }

  return (
    <div className="grid gap-4">
      <SectionHeading title="Daily updates" detail="Only approved updates reach parents." action={<div className="w-44"><Select value={filter} onValueChange={(value) => setFilter(value as ReviewStatus | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All</SelectItem>{["Submitted", "Approved", "Rejected"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div>} />
      {rows.length === 0 ? <EmptyState title="Nothing here" detail="No daily updates match this filter." /> : rows.map((row) => {
        const chapter = state.plannedChapters.find((item) => item.id === row.chapterId)
        return (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><StatusBadge value={row.reviewStatus} /><span className="text-sm font-medium">{row.teacherName}</span></div><span className="text-xs text-muted-foreground">{classLabel(state.classes, row.classId)} · {row.subject} · {formatDate(row.date)}</span></div>
              <CardTitle className="text-base">{chapter?.title ?? "Unknown chapter"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {row.classwork ? <p><span className="text-muted-foreground">Classwork:</span> {row.classwork}</p> : null}
              {row.homework ? <p><span className="text-muted-foreground">Homework:</span> {row.homework}</p> : null}
              {row.remarks ? <p><span className="text-muted-foreground">Remarks:</span> {row.remarks}</p> : null}
              {row.reviewedBy ? <p className="text-xs text-muted-foreground">Reviewed by {row.reviewedBy}{row.reviewNote ? ` — ${row.reviewNote}` : ""}</p> : null}
              {row.reviewStatus === "Submitted" ? <Textarea value={notes[row.id] ?? ""} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} placeholder="Note to the teacher (required to reject)" /> : null}
            </CardContent>
            {row.reviewStatus === "Submitted" ? (
              <CardFooter className="gap-2"><Button size="sm" onClick={() => decide(row.id, "Approved")}>Approve</Button><Button size="sm" variant="destructive" onClick={() => decide(row.id, "Rejected")}>Reject</Button></CardFooter>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

// ---- weekly subject tests (UR-05 / UR-06) ----------------------------------------------

export function MarksDialog({ test, onClose }: { test: WeeklyTest | null; onClose: () => void }) {
  const { state, saveWeeklyMarks } = useSchool()
  const actor = useActor()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const current = test ? state.weeklyTests.find((row) => row.id === test.id) ?? null : null

  function close() {
    setDraft({})
    onClose()
  }

  function save() {
    if (!current) return
    const results = current.results.map((row) => {
      const raw = draft[row.studentId]
      if (raw === undefined) return row
      return { studentId: row.studentId, score: raw === "" ? null : Number(raw) }
    })
    const message = saveWeeklyMarks(current.id, results, actor)
    if (message) toast.error(message)
    else {
      toast.success("Marks saved — management publishes them to parents")
      close()
    }
  }

  return (
    <Dialog open={Boolean(current)} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {current ? (
          <>
            <DialogHeader><DialogTitle>{current.subject} · week {current.week}</DialogTitle><DialogDescription>{classLabel(state.classes, current.classId)} · {weekdayOf(current.date)} {formatDate(current.date)} · out of {current.max}</DialogDescription></DialogHeader>
            <div className="grid gap-2">
              {current.results.map((row) => (
                <div key={row.studentId} className="flex items-center justify-between gap-3 text-sm">
                  <span>{studentName(state.students, row.studentId)}</span>
                  <Input className="h-8 w-24" inputMode="numeric" disabled={current.status === "Published"} value={draft[row.studentId] ?? (row.score === null ? "" : String(row.score))} onChange={(event) => setDraft({ ...draft, [row.studentId]: event.target.value.replace(/[^0-9.]/g, "") })} />
                </div>
              ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={close}>Close</Button>{current.status !== "Published" ? <Button onClick={save}>Save marks</Button> : null}</DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ScoreCell({ test, studentId }: { test: WeeklyTest; studentId: string }) {
  const { state } = useSchool()
  const score = test.results.find((row) => row.studentId === studentId)?.score ?? null
  if (test.status === "Scheduled" || score === null) return <span className="text-muted-foreground">—</span>
  const failed = (score / test.max) * 100 < state.settings.dailyTestRules.passPercent
  return <span className={failed ? "font-semibold text-destructive" : ""}>{score}/{test.max}{test.status !== "Published" ? "*" : ""}</span>
}

export function WeeklyTestsPanel() {
  const { state, saveTestSchedule, generateMonthTests, publishWeeklyTest } = useSchool()
  const actor = useActor()
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [classId, setClassId] = useState("g7b")
  const [form, setForm] = useState({ classId: "g7b", subject: "Mathematics", weekday: "Thursday", periodIndex: "4", max: "20" })
  const [marking, setMarking] = useState<WeeklyTest | null>(null)
  const rules = state.settings.dailyTestRules
  const tests = state.weeklyTests.filter((test) => test.month === month).sort((a, b) => a.date.localeCompare(b.date) || a.classId.localeCompare(b.classId))
  const summaries = useMemo(() => monthlySummaries(state.weeklyTests, month, rules), [state.weeklyTests, month, rules])
  const classRows = summaries.filter((row) => row.classId === classId).sort((a, b) => a.subject.localeCompare(b.subject) || studentName(state.students, a.studentId).localeCompare(studentName(state.students, b.studentId)))
  const flagged = summaries.filter((row) => row.flaggedForFollowUp)

  return (
    <Tabs defaultValue="tests" className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList><TabsTrigger value="tests">Tests</TabsTrigger><TabsTrigger value="summary">Monthly summary</TabsTrigger><TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger><TabsTrigger value="schedule">Test days</TabsTrigger></TabsList>
        <Input type="month" className="w-44" value={month} onChange={(event) => setMonth(event.target.value || CURRENT_MONTH)} />
      </div>
      <Alert><ClipboardList /><AlertTitle>Rules for {monthLabel(month)}</AlertTitle><AlertDescription>Pass at {rules.passPercent}%. More than {rules.maxFailsPerMonth} failed test(s) in a subject ⇒ Failed and flagged for follow-up.{rules.lowMarksEnabled ? ` ${rules.lowMarksMinPassed}+ passed but average below ${rules.lowMarksBelowPercent}% ⇒ Low marks.` : ""} * = not yet published.</AlertDescription></Alert>

      <TabsContent value="tests">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Weekly tests · {monthLabel(month)}</CardTitle><CardDescription>Parents see marks only after publishing.</CardDescription></div><Button variant="outline" onClick={() => { const message = generateMonthTests(month, actor); if (message) toast.error(message); else toast.success("Tests generated from the test days") }}>Generate month</Button></CardHeader>
          <CardContent>
            {tests.length === 0 ? <EmptyState title="No tests" detail="Set test days, then generate the month." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Week</TableHead><TableHead>Marks</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>{weekdayOf(test.date).slice(0, 3)} {formatDate(test.date)}</TableCell>
                      <TableCell>{classLabel(state.classes, test.classId)}</TableCell>
                      <TableCell>{test.subject}</TableCell>
                      <TableCell>W{test.week}</TableCell>
                      <TableCell>{test.results.filter((row) => row.score !== null).length}/{test.results.length}</TableCell>
                      <TableCell><StatusBadge value={test.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {test.status !== "Published" && test.date <= TODAY ? <Button size="sm" variant="outline" onClick={() => setMarking(test)}>Marks</Button> : null}
                          {test.status === "MarksEntered" ? <Button size="sm" onClick={() => { const message = publishWeeklyTest(test.id, actor); if (message) toast.error(message); else toast.success("Published to parents") }}>Publish</Button> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="summary">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Monthly subject summary</CardTitle><CardDescription>Each weekly test of the month, then the outcome.</CardDescription></div><div className="w-52"><Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{state.classes.map((klass) => <SelectItem key={klass.id} value={klass.id}>{klass.label}</SelectItem>)}</SelectGroup></SelectContent></Select></div></CardHeader>
          <CardContent>
            {classRows.length === 0 ? <EmptyState title="No weekly tests" detail="This class has no weekly tests in the selected month." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Weekly tests</TableHead><TableHead>Passed / failed</TableHead><TableHead>Average</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
                <TableBody>
                  {classRows.map((row) => (
                    <TableRow key={`${row.studentId}-${row.subject}`}>
                      <TableCell className="font-medium">{studentName(state.students, row.studentId)}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell><div className="flex gap-3">{row.tests.map((test) => <span key={test.id} className="text-xs">W{test.week}: <ScoreCell test={test} studentId={row.studentId} /></span>)}</div></TableCell>
                      <TableCell>{row.passedCount} / {row.failedCount}</TableCell>
                      <TableCell>{row.averagePercent === null ? "—" : `${row.averagePercent}%`}</TableCell>
                      <TableCell><div className="flex items-center gap-1"><StatusBadge value={row.status} />{row.flaggedForFollowUp ? <Flag className="size-4 text-destructive" /> : null}</div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="flagged">
        <Card>
          <CardHeader><CardTitle>Flagged for follow-up</CardTitle><CardDescription>Failed for the subject this month.</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {flagged.length === 0 ? <p className="text-sm text-muted-foreground">Nobody is flagged for {monthLabel(month)}.</p> : flagged.map((row) => (
              <div key={`${row.studentId}-${row.subject}`} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span><span className="font-medium">{studentName(state.students, row.studentId)}</span> · {classLabel(state.classes, row.classId)} · {row.subject}</span>
                <span className="text-muted-foreground">{row.failedCount} failed of {row.testsTaken}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="schedule" className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Test days</CardTitle><CardDescription>One weekly test per class and subject — about four a month.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Day</TableHead><TableHead>Period</TableHead><TableHead>Out of</TableHead></TableRow></TableHeader>
              <TableBody>
                {state.testSchedules.map((row) => (
                  <TableRow key={row.id}><TableCell>{classLabel(state.classes, row.classId)}</TableCell><TableCell>{row.subject}</TableCell><TableCell>{row.weekday}</TableCell><TableCell>P{row.periodIndex}</TableCell><TableCell>{row.max}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader><CardTitle>Set test day</CardTitle><CardDescription>Replaces the existing day for that class and subject.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <ClassSubjectPicker classId={form.classId} subject={form.subject} onClass={(value) => setForm({ ...form, classId: value })} onSubject={(value) => setForm({ ...form, subject: value })} />
            <Field label="Weekday"><Select value={form.weekday} onValueChange={(weekday) => setForm({ ...form, weekday })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{WEEKDAYS.slice(0, 5).map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Period"><Input value={form.periodIndex} onChange={(event) => setForm({ ...form, periodIndex: event.target.value.replace(/[^0-9]/g, "") })} /></Field>
              <Field label="Out of"><Input value={form.max} onChange={(event) => setForm({ ...form, max: event.target.value.replace(/[^0-9]/g, "") })} /></Field>
            </div>
          </CardContent>
          <CardFooter><Button onClick={() => { const message = saveTestSchedule({ classId: form.classId, subject: form.subject, weekday: form.weekday, periodIndex: Number(form.periodIndex) || 1, max: Number(form.max) || 0 }, actor); if (message) toast.error(message); else toast.success("Test day saved") }}>Save</Button></CardFooter>
        </Card>
      </TabsContent>
      <MarksDialog test={marking} onClose={() => setMarking(null)} />
    </Tabs>
  )
}

// ---- result visibility (UR-07 / §8) ---------------------------------------------------

const FEE_RULE_LABELS: Record<ResultFeeRule, string> = {
  all_due_paid: "All fees due up to the exam's fee month are paid",
  exam_month_paid: "The exam's fee month is paid",
  disabled: "No fee check",
}

export function ResultsGatePanel() {
  const { state, grantResultOverride, revokeResultOverride } = useSchool()
  const actor = useActor()
  const exams = [...new Map(state.sheets.map((sheet) => [sheet.examId, sheet])).values()]
  const [examId, setExamId] = useState(exams.find((sheet) => sheet.status === "Published")?.examId ?? exams[0]?.examId ?? "")
  const [granting, setGranting] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const rule = state.settings.resultVisibility.feeRule
  const sheets = state.sheets.filter((sheet) => sheet.examId === examId)
  const exam = sheets[0]
  const studentIds = [...new Set(sheets.flatMap((sheet) => sheet.rows.map((row) => row.studentId)))]
  const context = { feeMonths: state.feeMonths, overrides: state.resultOverrides, rule, today: TODAY }

  function grant() {
    if (!granting) return
    const message = grantResultOverride(examId, granting, reason, actor)
    if (message) toast.error(message)
    else {
      toast.success("Result released to the parent")
      setGranting(null)
      setReason("")
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Result visibility</CardTitle><CardDescription>Fee rule: {FEE_RULE_LABELS[rule]}{exam?.feeMonth ? ` (${monthLabel(exam.feeMonth)})` : ""}. Checked when the parent opens results; the result itself never changes.</CardDescription></div>
          <div className="w-72"><Select value={examId} onValueChange={setExamId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{exams.map((sheet) => <SelectItem key={sheet.examId} value={sheet.examId}>{sheet.examName}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Published subjects</TableHead><TableHead>Fee rule</TableHead><TableHead>Override</TableHead><TableHead>Parent sees</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {studentIds.map((studentId) => {
                const own = sheets.filter((sheet) => sheet.rows.some((row) => row.studentId === studentId))
                const published = own.filter((sheet) => sheet.status === "Published")
                const cleared = feeCleared(state.feeMonths, studentId, exam?.feeMonth, rule, TODAY)
                const override = activeOverride(state.resultOverrides, examId, studentId)
                const visible = published.some((sheet) => resultVisibility(sheet, studentId, context).visible)
                return (
                  <TableRow key={studentId}>
                    <TableCell className="font-medium">{studentName(state.students, studentId)}</TableCell>
                    <TableCell>{classLabel(state.classes, own[0]?.classId ?? "")}</TableCell>
                    <TableCell>{published.length}/{own.length}</TableCell>
                    <TableCell>{cleared ? <StatusBadge value="Paid" /> : <StatusBadge value="Unpaid" />}</TableCell>
                    <TableCell>{override ? <span className="text-xs"><StatusBadge value="Override" /><span className="block text-muted-foreground">{override.grantedBy}: {override.reason}</span></span> : "—"}</TableCell>
                    <TableCell>{!published.length ? <StatusBadge value="Not published" /> : <StatusBadge value={visible ? "Visible" : "Withheld"} />}</TableCell>
                    <TableCell className="text-right">
                      {override ? <Button size="sm" variant="ghost" onClick={() => { const message = revokeResultOverride(override.id, actor); if (message) toast.error(message); else toast.success("Override revoked") }}>Revoke</Button> : !cleared ? <Button size="sm" variant="outline" onClick={() => setGranting(studentId)}>Override</Button> : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Override history</CardTitle><CardDescription>Who released which result, when and why.</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          {state.resultOverrides.length === 0 ? <p className="text-sm text-muted-foreground">No overrides.</p> : state.resultOverrides.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
              <span><span className="font-medium">{studentName(state.students, row.studentId)}</span> · {state.sheets.find((sheet) => sheet.examId === row.examId)?.examName} — {row.reason}</span>
              <span className="text-xs text-muted-foreground">{row.grantedBy} · {timeAgo(row.grantedAt)}{row.revokedAt ? ` · revoked by ${row.revokedBy}` : ""}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={Boolean(granting)} onOpenChange={(value) => !value && setGranting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Release result for {granting ? studentName(state.students, granting) : ""}</DialogTitle><DialogDescription>Visibility only — marks, grades and fee records are not changed. This is audited.</DialogDescription></DialogHeader>
          <Field label="Reason"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Instalment plan agreed with the principal" /></Field>
          <DialogFooter><Button variant="outline" onClick={() => setGranting(null)}>Cancel</Button><Button onClick={grant}><ShieldAlert data-icon="inline-start" />Release result</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- settings --------------------------------------------------------------------------

export function SettingsPanel() {
  const { state, updateSettings } = useSchool()
  const actor = useActor()
  const [rules, setRules] = useState<DailyTestRules>(state.settings.dailyTestRules)
  const [visibility, setVisibility] = useState(state.settings.resultVisibility)
  const canAcademic = can(actor.role, "settings.academic")
  const canResults = can(actor.role, "settings.results")
  const number = (key: keyof DailyTestRules) => (event: React.ChangeEvent<HTMLInputElement>) => setRules({ ...rules, [key]: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0 })

  function save(patch: Parameters<typeof updateSettings>[0]) {
    const message = updateSettings(patch, actor)
    if (message) toast.error(message)
    else toast.success("Settings saved")
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><div className="flex items-center gap-2"><ClipboardCheck className="size-5" /><CardTitle>Weekly test pass criteria</CardTitle></div><CardDescription>Used for every monthly subject outcome (BR-08).</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Pass mark (%)"><Input disabled={!canAcademic} value={rules.passPercent} onChange={number("passPercent")} /></Field>
          <Field label="Failed tests allowed per month" hint="More than this ⇒ Failed + follow-up"><Input disabled={!canAcademic} value={rules.maxFailsPerMonth} onChange={number("maxFailsPerMonth")} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch disabled={!canAcademic} checked={rules.lowMarksEnabled} onCheckedChange={(lowMarksEnabled) => setRules({ ...rules, lowMarksEnabled })} />Flag weak passes as Low marks</label>
          <Field label="Low marks: minimum passed tests"><Input disabled={!canAcademic || !rules.lowMarksEnabled} value={rules.lowMarksMinPassed} onChange={number("lowMarksMinPassed")} /></Field>
          <Field label="Low marks: average below (%)"><Input disabled={!canAcademic || !rules.lowMarksEnabled} value={rules.lowMarksBelowPercent} onChange={number("lowMarksBelowPercent")} /></Field>
        </CardContent>
        {canAcademic ? <CardFooter><Button onClick={() => save({ dailyTestRules: rules })}>Save criteria</Button></CardFooter> : null}
      </Card>
      <Card>
        <CardHeader><div className="flex items-center gap-2"><BookOpen className="size-5" /><CardTitle>Result fee rule</CardTitle></div><CardDescription>{canResults ? "Applied when a parent opens results." : "Set by the super admin."}</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Parents see published results when">
            <Select disabled={!canResults} value={visibility.feeRule} onValueChange={(feeRule) => setVisibility({ ...visibility, feeRule: feeRule as ResultFeeRule })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{(Object.keys(FEE_RULE_LABELS) as ResultFeeRule[]).map((key) => <SelectItem key={key} value={key}>{FEE_RULE_LABELS[key]}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><Switch disabled={!canResults} checked={visibility.requireOverrideReason} onCheckedChange={(requireOverrideReason) => setVisibility({ ...visibility, requireOverrideReason })} />Require a reason for manual overrides</label>
        </CardContent>
        {canResults ? <CardFooter><Button onClick={() => save({ resultVisibility: visibility })}>Save rule</Button></CardFooter> : null}
      </Card>
    </div>
  )
}
