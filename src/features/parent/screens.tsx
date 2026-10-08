import { useEffect, useState } from "react"
import { Cell, Pie, PieChart } from "recharts"
import { BadgeCheck, BookOpen, ClipboardList, Download, GraduationCap, Lock, Printer, ReceiptText, UserCheck, WalletCards } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, MetricCard, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FeeMonthTable } from "@/features/fees/components"
import { feeMonthsLabel, printReceipt } from "@/features/fees/receipts"
import { useSchool } from "@/data/store"
import { isAttendancePresent, type MarkSheet, type SchoolState } from "@/data/types"
import { monthlySummaries, resultVisibility, weekdayOf } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { feeMonthStatus, monthLabel, outstanding } from "@/lib/fees"
import { classLabel, formatDate, gradeFromScore, pkr } from "@/lib/format"

/** Parent visibility for one sheet, evaluated now against the fee rule and overrides (UR-07). */
function visibilityFor(state: SchoolState, sheet: MarkSheet, studentId: string) {
  return resultVisibility(sheet, studentId, { feeMonths: state.feeMonths, overrides: state.resultOverrides, rule: state.settings.resultVisibility.feeRule, today: getToday() })
}

function unpaidMonths(state: SchoolState, studentId: string) {
  const currentMonth = getToday().slice(0, 7)
  return state.feeMonths.filter((month) => month.studentId === studentId && month.month <= currentMonth && outstanding(month) > 0).sort((a, b) => a.month.localeCompare(b.month))
}

const attendanceConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  absent: { label: "Absent", color: "var(--chart-4)" },
  leave: { label: "Leave", color: "var(--chart-3)" },
} satisfies ChartConfig

function useChild() {
  const { state } = useSchool()
  const stored = localStorage.getItem("eduvia-child")
  const options = state.students
  const defaultId = options[0]?.id ?? ""
  const [selected, setChildId] = useState(() => (stored && options.some((s) => s.id === stored) ? stored : defaultId))
  const childId = options.some((s) => s.id === selected) ? selected : defaultId
  useEffect(() => {
    if (childId) localStorage.setItem("eduvia-child", childId)
  }, [childId])
  const child = options.find((student) => student.id === childId) ?? options[0]
  return { state, child, childId, setChildId, options }
}

function ChildSwitcher({ childId, onChange, options }: { childId: string; onChange: (id: string) => void; options: { id: string; name: string; classId: string }[] }) {
  const { state } = useSchool()
  return (
    <Select value={childId} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map((student) => <SelectItem key={student.id} value={student.id}>{student.name} · {classLabel(state.classes, student.classId)}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  )
}

export function ParentHome() {
  const { state, child, childId, setChildId, options } = useChild()
  const today = getToday()
  const currentMonth = today.slice(0, 7)
  const marks = state.attendance.filter((mark) => mark.studentId === child.id && mark.date.startsWith(currentMonth))
  const present = marks.filter((mark) => isAttendancePresent(mark.status)).length
  const rate = marks.length ? `${Math.round((present / marks.length) * 1000) / 10}%` : "—"
  const visible = state.sheets.filter((sheet) => sheet.classId === child.classId && visibilityFor(state, sheet, child.id).visible)
  const withheld = state.sheets.some((sheet) => sheet.classId === child.classId && sheet.status === "Published" && !visibilityFor(state, sheet, child.id).visible)
  const scores = visible.flatMap((sheet) => sheet.rows.filter((row) => row.studentId === child.id && row.score !== null).map((row) => ((row.score as number) / sheet.max) * 100))
  const average = scores.length ? `${Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10}%` : withheld ? "Withheld" : "—"
  const unpaid = unpaidMonths(state, child.id)
  const lessons = state.dailyLessons.filter((row) => row.classId === child.classId && row.reviewStatus === "Approved").sort((a, b) => b.date.localeCompare(a.date))
  const homework = lessons.filter((row) => row.homework)
  const day = weekdayOf(today)
  const periods = state.slots.filter((slot) => slot.classId === child.classId && slot.day === day).sort((a, b) => a.periodIndex - b.periodIndex)
  const updates = lessons.slice(0, 3)

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-heading text-2xl font-semibold">{child.name}</h2><StatusBadge value={child.status} /></div>
          <p className="mt-1 text-sm text-muted-foreground">{classLabel(state.classes, child.classId)} · {child.id}</p>
        </div>
        <ChildSwitcher childId={childId} onChange={setChildId} options={options} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UserCheck} label={`${monthLabel(currentMonth)} attendance`} value={rate} note={`${present} of ${marks.length} days`} tone="accent" />
        <MetricCard icon={GraduationCap} label="Published results" value={average} note={withheld ? "Held until fees are cleared" : "Average of visible results"} />
        <MetricCard icon={WalletCards} label="Fee status" value={unpaid.length ? `${unpaid.length} unpaid` : "Paid"} note={unpaid.length ? unpaid.map((month) => monthLabel(month.month)).join(", ") : "No month outstanding"} />
        <MetricCard icon={BookOpen} label="Homework" value={String(homework.length).padStart(2, "0")} note="From approved daily updates" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Today at school</CardTitle><CardDescription>{formatDate(today)}</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {periods.map((slot) => {
              const attendance = state.attendance.find((mark) => mark.studentId === child.id && mark.date === today)
              return (
                <div key={slot.id} className="flex items-center gap-4 rounded-xl border p-3">
                  <p className="w-12 text-xs font-semibold">{slot.time}</p>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex-1"><p className="text-sm font-medium">{slot.subject}</p><p className="text-xs text-muted-foreground">{substituteFor(state, slot.classId, slot.periodIndex) ?? slot.teacher} · {slot.room}</p></div>
                  <StatusBadge value={slot.time < "11:00" ? attendance?.status ?? "Present" : "Upcoming"} />
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest updates</CardTitle><CardDescription>Approved by the school</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            {updates.length === 0 ? <EmptyState title="No updates" detail="Approved lesson updates for this class will appear here." /> : updates.map((item) => (
              <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2"><StatusBadge value={item.subject} /><span className="text-xs text-muted-foreground">{formatDate(item.date)}</span></div>
                <p className="mt-2 text-sm font-medium">{state.plannedChapters.find((chapter) => chapter.id === item.chapterId)?.title}</p>
                {item.homework ? <p className="text-sm leading-6 text-muted-foreground">Homework: {item.homework}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ParentAttendance() {
  const { state, child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const marks = state.attendance.filter((mark) => mark.studentId === child.id && mark.date.startsWith(currentMonth))
  const present = marks.filter((mark) => isAttendancePresent(mark.status)).length
  const absent = marks.filter((mark) => mark.status === "Absent").length
  const leave = marks.filter((mark) => mark.status === "Leave" || mark.status === "Excused").length
  const late = marks.filter((mark) => mark.status === "Late").length
  const pie = [
    { name: "Present", value: present, fill: "var(--color-present)" },
    { name: "Absent", value: absent, fill: "var(--color-absent)" },
    { name: "Leave / Excused", value: leave, fill: "var(--color-leave)" },
    ...(late ? [{ name: "Late", value: late, fill: "var(--warning)" }] : []),
  ]
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><ChildSwitcher childId={childId} onChange={setChildId} options={options} /></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>September summary</CardTitle><CardDescription>{marks.length} instructional days recorded</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer config={attendanceConfig} className="mx-auto h-[240px] max-w-sm">
              <PieChart><ChartTooltip content={<ChartTooltipContent nameKey="name" />} /><Pie data={pie} dataKey="value" nameKey="name" innerRadius={68} outerRadius={96} strokeWidth={4}>{pie.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Pie></PieChart>
            </ChartContainer>
            <div className="grid grid-cols-3 gap-2 text-center">{[[present, "Present"], [absent, "Absent"], [leave, "Leave"]].map(([value, label]) => <div key={label} className="rounded-xl bg-muted p-3"><p className="font-heading text-xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily record</CardTitle><CardDescription>Verified from the class register</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {marks.map((mark) => (
              <div key={mark.date} className={`grid aspect-square place-items-center rounded-xl border text-xs font-semibold ${mark.status === "Absent" ? "border-destructive/20 bg-destructive/10 text-destructive" : mark.status === "Leave" ? "border-accent/30 bg-accent/15" : "bg-success/10 text-success"}`} title={mark.status}>{Number(mark.date.slice(-2))}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ParentResults() {
  const { state, child, childId, setChildId, options } = useChild()
  const sheets = state.sheets.filter((sheet) => sheet.classId === child.classId && sheet.status === "Published")
  const exams = [...new Map(sheets.map((sheet) => [sheet.examId, sheet.examName])).entries()]
  const [examChoice, setExam] = useState(exams[0]?.[0] ?? "")
  const examId = exams.some(([id]) => id === examChoice) ? examChoice : exams[0]?.[0] ?? ""
  const rows = sheets.filter((sheet) => sheet.examId === examId)
  const gate = rows[0] ? visibilityFor(state, rows[0], child.id) : null
  const visible = Boolean(gate?.visible)
  const scores = visible ? rows.flatMap((sheet) => sheet.rows.filter((row) => row.studentId === child.id && row.score !== null).map((row) => ((row.score as number) / sheet.max) * 100)) : []
  const overall = scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0
  const unpaid = unpaidMonths(state, child.id)
  return (
    <div className="grid gap-5">
      <SectionHeading title="Results & DMC" detail="Only published examinations are visible." action={<div className="flex flex-col gap-2 sm:flex-row"><ChildSwitcher childId={childId} onChange={setChildId} options={options} />{exams.length ? <div className="w-full sm:w-72"><Select value={examId} onValueChange={setExam}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{exams.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectGroup></SelectContent></Select></div> : null}</div>} />
      {rows.length === 0 ? <EmptyState title="No published results" detail="When the school publishes an exam for this class, the DMC will show here." /> : !visible ? (
        <Alert>
          <Lock className="size-4" />
          <AlertTitle>Result withheld</AlertTitle>
          <AlertDescription>{rows[0].examName} is published, but it is held until fees are cleared{unpaid.length ? ` (${unpaid.map((month) => monthLabel(month.month)).join(", ")})` : ""}. Please contact the school office.</AlertDescription>
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><StatusBadge value="Published" /><h2 className="mt-4 font-heading text-2xl font-semibold">{rows[0].examName}</h2><p className="mt-1 text-sm text-primary-foreground/70">{classLabel(state.classes, child.classId)}</p></div>
              <div><p className="text-xs text-primary-foreground/60">Overall</p><p className="font-heading text-3xl font-semibold">{overall}%</p></div>
            </div>
          </div>
          <CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((sheet) => {
                  const score = sheet.rows.find((row) => row.studentId === child.id)?.score ?? null
                  return <TableRow key={sheet.id}><TableCell className="font-medium">{sheet.subject}</TableCell><TableCell>{score ?? "—"} / {sheet.max}</TableCell><TableCell>{score === null ? "—" : <StatusBadge value={gradeFromScore(score, sheet.max)} />}</TableCell></TableRow>
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter><Button onClick={() => toast.success(`DMC prepared for ${child.name}`)}><Download data-icon="inline-start" />Download DMC</Button></CardFooter>
        </Card>
      )}
    </div>
  )
}

/** Published weekly test marks and the month's outcome per subject (UR-05 / UR-06). */
export function ParentTests() {
  const { state, child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const rows = monthlySummaries(state.weeklyTests, currentMonth, state.settings.dailyTestRules, { classId: child.classId, studentIds: [child.id], publishedOnly: true })
  return (
    <div className="grid gap-5">
      <SectionHeading title={`Weekly tests · ${monthLabel(currentMonth)}`} detail="Marks appear once the school publishes them." action={<ChildSwitcher childId={childId} onChange={setChildId} options={options} />} />
      {rows.length === 0 ? <EmptyState title="No weekly tests" detail="Weekly subject tests for this class will appear here." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.subject}>
              <CardHeader>
                <div className="flex items-center justify-between"><CardTitle className="text-base">{row.subject}</CardTitle><StatusBadge value={row.status} /></div>
                <CardDescription>{row.passedCount} passed · {row.failedCount} failed{row.averagePercent === null ? "" : ` · average ${row.averagePercent}%`}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {row.tests.map((test) => {
                  const score = test.results.find((result) => result.studentId === child.id)?.score ?? null
                  return (
                    <div key={test.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span>Week {test.week} · {formatDate(test.date)}</span>
                      {test.status === "Published" ? <span className="font-medium">{score ?? "Absent"}{score === null ? "" : ` / ${test.max}`}</span> : <span className="text-xs text-muted-foreground">{test.status === "Scheduled" ? "Upcoming" : "Awaiting publication"}</span>}
                    </div>
                  )
                })}
                {row.flaggedForFollowUp ? <p className="text-xs text-destructive"><ClipboardList className="mr-1 inline size-3.5" />Flagged for follow-up by the school this month.</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function ParentFees() {
  const { state, child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const payments = state.payments.filter((payment) => payment.studentId === child.id)
  const unpaid = unpaidMonths(state, child.id)
  const balance = unpaid.reduce((sum, month) => sum + outstanding(month), 0)
  const paidMonths = state.feeMonths.filter((month) => month.studentId === child.id && ["Paid", "Advance"].includes(feeMonthStatus(month, currentMonth))).length
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><ChildSwitcher childId={childId} onChange={setChildId} options={options} /></div>
      {unpaid.length === 0 ? <Alert className="border-success/20 bg-success/5"><BadgeCheck className="size-4 text-success" /><AlertTitle>All clear</AlertTitle><AlertDescription>No month is outstanding for {child.name}.</AlertDescription></Alert> : (
        <Alert>
          <AlertTitle>{unpaid.length} {unpaid.length === 1 ? "month" : "months"} unpaid</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 grid gap-1">{unpaid.map((month) => <li key={month.id} className="flex items-center gap-2">{monthLabel(month.month)} · {pkr(outstanding(month))} <StatusBadge value={feeMonthStatus(month, currentMonth)} /></li>)}</ul>
            <p className="mt-2 text-xs">Payments are always applied to the oldest unpaid month first.</p>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard icon={WalletCards} label="Balance due" value={pkr(balance)} note={unpaid.map((month) => monthLabel(month.month)).join(", ") || "Nothing due"} tone="accent" />
        <MetricCard icon={ReceiptText} label="Months paid" value={String(paidMonths)} note={`${payments.filter((payment) => payment.status === "Paid").length} receipts on record`} />
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly fee status</CardTitle><CardDescription>Paid, partially paid, unpaid or paid in advance</CardDescription></CardHeader>
        <CardContent><FeeMonthTable studentId={child.id} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Receipt history</CardTitle><CardDescription>Read-only family view</CardDescription></CardHeader>
        <CardContent>
          {payments.length === 0 ? <EmptyState title="No receipts" detail="Payments recorded for this child will be listed here." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Fee months</TableHead><TableHead>Paid on</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.ref}>
                    <TableCell className="font-mono text-xs">{payment.ref}</TableCell>
                    <TableCell>{feeMonthsLabel(payment)}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell><StatusBadge value={payment.status} /></TableCell>
                    <TableCell>{payment.status === "Paid" ? <Button variant="ghost" size="icon-sm" aria-label="Print receipt" onClick={() => printReceipt(state, payment)}><Printer /></Button> : null}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ParentTimetable() {
  const { state, child, childId, setChildId, options } = useChild()
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const times = [...new Set(state.slots.filter((slot) => slot.classId === child.classId).map((slot) => slot.time))].sort()
  return (
    <div className="grid gap-5">
      <SectionHeading title="Weekly timetable" detail={`${child.name} · ${classLabel(state.classes, child.classId)}`} action={<ChildSwitcher childId={childId} onChange={setChildId} options={options} />} />
      <Card>
        <CardContent className="overflow-x-auto p-5">
          {times.length === 0 ? <EmptyState title="Timetable not published" detail="The school has not scheduled periods for this class yet." /> : (
            <div className="grid min-w-[760px] gap-2 text-xs" style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div />
              {days.map((day) => <div key={day} className="pb-2 text-center font-semibold">{day}</div>)}
              {times.flatMap((time) => [
                <div key={time} className="pt-4 text-muted-foreground">{time}</div>,
                ...days.map((day) => {
                  const slot = state.slots.find((item) => item.classId === child.classId && item.day === day && item.time === time)
                  return <div key={`${day}-${time}`} className="min-h-20 rounded-xl border bg-muted/30 p-3">{slot ? <><p className="font-semibold">{slot.subject}</p><p className="mt-2 text-muted-foreground">{slot.room}</p></> : <p className="text-muted-foreground">Free</p>}</div>
                }),
              ])}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ParentUpdates() {
  const { state, child, childId, setChildId, options } = useChild()
  // Only management-approved lesson updates and published notices reach parents (UR-04).
  const lessons = state.dailyLessons.filter((row) => row.classId === child.classId && row.reviewStatus === "Approved").sort((a, b) => b.date.localeCompare(a.date))
  const notices = state.updates.filter((item) => item.classId === child.classId && item.status === "Published")
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><ChildSwitcher childId={childId} onChange={setChildId} options={options} /></div>
      {lessons.length === 0 && notices.length === 0 ? <EmptyState title="No updates yet" detail="Lesson updates appear after the school approves them." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between"><StatusBadge value={item.subject} /><span className="text-xs text-muted-foreground">{formatDate(item.date)}</span></div>
                <CardTitle className="mt-3 text-base">{state.plannedChapters.find((chapter) => chapter.id === item.chapterId)?.title}</CardTitle>
                <CardDescription className="grid gap-1 text-sm leading-6 text-foreground/80">
                  {item.classwork ? <span>Classwork: {item.classwork}</span> : null}
                  {item.homework ? <span>Homework: {item.homework}</span> : null}
                  {item.remarks ? <span>Remarks: {item.remarks}</span> : null}
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground"><BadgeCheck className="mr-2 size-4 text-success" />{item.teacherName} · approved by the school</CardFooter>
            </Card>
          ))}
          {notices.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between"><StatusBadge value={item.kind} /><span className="text-xs text-muted-foreground">{formatDate(item.due)}</span></div>
                <CardTitle className="mt-3 text-base">{item.subject}</CardTitle>
                <CardDescription className="text-sm leading-6 text-foreground/80">{item.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/** The teacher actually covering a period today (substitute when one is assigned). */
function substituteFor(state: SchoolState, classId: string, periodIndex: number) {
  const row = state.substitutions.find((item) => item.classId === classId && item.date === getToday() && item.periodIndex === periodIndex)
  return row ? `${state.staff.find((person) => person.id === row.substituteTeacherId)?.name} (substitute)` : null
}

export function ParentPortal({ section }: { section: string }) {
  if (section === "attendance") return <ParentAttendance />
  if (section === "results") return <ParentResults />
  if (section === "tests") return <ParentTests />
  if (section === "fees") return <ParentFees />
  if (section === "timetable") return <ParentTimetable />
  if (section === "updates") return <ParentUpdates />
  return <ParentHome />
}
