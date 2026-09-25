import { useEffect, useState } from "react"
import { Cell, Pie, PieChart } from "recharts"
import { BadgeCheck, BookOpen, Download, GraduationCap, ReceiptText, UserCheck, WalletCards } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, MetricCard, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSchool } from "@/data/store"
import { PARENT_CHILDREN, TODAY } from "@/data/types"
import { classLabel, formatDate, gradeFromScore, pkr } from "@/lib/format"

const attendanceConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  absent: { label: "Absent", color: "var(--chart-4)" },
  leave: { label: "Leave", color: "var(--chart-3)" },
} satisfies ChartConfig

function useChild() {
  const { state } = useSchool()
  const [childId, setChildId] = useState(() => localStorage.getItem("eduvia-child") || PARENT_CHILDREN[0])
  useEffect(() => {
    localStorage.setItem("eduvia-child", childId)
  }, [childId])
  const child = state.students.find((student) => student.id === childId) ?? state.students[0]
  return { state, child, childId, setChildId, options: state.students.filter((student) => PARENT_CHILDREN.includes(student.id)) }
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
  const marks = state.attendance.filter((mark) => mark.studentId === child.id && mark.date.startsWith("2026-09"))
  const present = marks.filter((mark) => mark.status === "Present").length
  const rate = marks.length ? `${Math.round((present / marks.length) * 1000) / 10}%` : "—"
  const published = state.sheets.filter((sheet) => sheet.status === "Published" && sheet.classId === child.classId && sheet.examName.includes("August"))
  const scores = published.flatMap((sheet) => sheet.rows.filter((row) => row.studentId === child.id && row.score !== null).map((row) => row.score as number))
  const average = scores.length ? `${Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10}%` : "—"
  const pending = state.payments.filter((payment) => payment.studentId === child.id && payment.status === "Pending")
  const homework = state.updates.filter((item) => item.classId === child.classId && item.status === "Published" && item.kind === "Homework")
  const day = "Wednesday"
  const periods = state.slots.filter((slot) => slot.classId === child.classId && slot.day === day).sort((a, b) => a.time.localeCompare(b.time))
  const updates = state.updates.filter((item) => item.classId === child.classId && item.status === "Published").slice(0, 3)

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
        <MetricCard icon={UserCheck} label="September attendance" value={rate} note={`${present} of ${marks.length} days`} tone="accent" />
        <MetricCard icon={GraduationCap} label="Latest published result" value={average} note="August assessment" />
        <MetricCard icon={WalletCards} label="Fee status" value={pending.length ? "Due" : "Paid"} note={pending.length ? `${pending.length} receipt pending` : "No outstanding receipt"} />
        <MetricCard icon={BookOpen} label="Homework" value={String(homework.length).padStart(2, "0")} note="Published this week" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Today at school</CardTitle><CardDescription>{formatDate(TODAY)}</CardDescription></CardHeader>
          <CardContent className="grid gap-2">
            {periods.map((slot) => {
              const attendance = state.attendance.find((mark) => mark.studentId === child.id && mark.date === TODAY)
              return (
                <div key={slot.id} className="flex items-center gap-4 rounded-xl border p-3">
                  <p className="w-12 text-xs font-semibold">{slot.time}</p>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex-1"><p className="text-sm font-medium">{slot.subject}</p><p className="text-xs text-muted-foreground">{slot.room}</p></div>
                  <StatusBadge value={slot.time < "11:00" ? attendance?.status ?? "Present" : "Upcoming"} />
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest updates</CardTitle><CardDescription>Approved by the school</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            {updates.length === 0 ? <EmptyState title="No updates" detail="Published homework and notices for this class will appear here." /> : updates.map((item) => (
              <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2"><StatusBadge value={item.kind} /><span className="text-xs text-muted-foreground">{item.subject}</span></div>
                <p className="mt-2 text-sm leading-6">{item.text}</p>
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
  const marks = state.attendance.filter((mark) => mark.studentId === child.id && mark.date.startsWith("2026-09"))
  const present = marks.filter((mark) => mark.status === "Present").length
  const absent = marks.filter((mark) => mark.status === "Absent").length
  const leave = marks.filter((mark) => mark.status === "Leave").length
  const pie = [
    { name: "Present", value: present, fill: "var(--color-present)" },
    { name: "Absent", value: absent, fill: "var(--color-absent)" },
    { name: "Leave", value: leave, fill: "var(--color-leave)" },
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
  const exams = [...new Set(sheets.map((sheet) => sheet.examName))]
  const [examChoice, setExam] = useState(exams[0] ?? "")
  const exam = exams.includes(examChoice) ? examChoice : exams[0] ?? ""
  const rows = sheets.filter((sheet) => sheet.examName === exam)
  const scores = rows.flatMap((sheet) => sheet.rows.filter((row) => row.studentId === child.id && row.score !== null).map((row) => row.score as number))
  const overall = scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0
  return (
    <div className="grid gap-5">
      <SectionHeading title="Results & DMC" detail="Only published examinations are visible." action={<div className="flex flex-col gap-2 sm:flex-row"><ChildSwitcher childId={childId} onChange={setChildId} options={options} />{exams.length ? <div className="w-full sm:w-72"><Select value={exam} onValueChange={setExam}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{exams.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectGroup></SelectContent></Select></div> : null}</div>} />
      {rows.length === 0 ? <EmptyState title="No published results" detail="When the school publishes an exam for this class, the DMC will show here." /> : (
        <Card className="overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><StatusBadge value="Published" /><h2 className="mt-4 font-heading text-2xl font-semibold">{exam}</h2><p className="mt-1 text-sm text-primary-foreground/70">{classLabel(state.classes, child.classId)}</p></div>
              <div><p className="text-xs text-primary-foreground/60">Overall</p><p className="font-heading text-3xl font-semibold">{overall}%</p></div>
            </div>
          </div>
          <CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((sheet) => {
                  const score = sheet.rows.find((row) => row.studentId === child.id)?.score
                  return <TableRow key={sheet.id}><TableCell className="font-medium">{sheet.subject}</TableCell><TableCell>{score ?? "—"} / {sheet.max}</TableCell><TableCell>{score === null || score === undefined ? "—" : <StatusBadge value={gradeFromScore(score, sheet.max)} />}</TableCell></TableRow>
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

export function ParentFees() {
  const { state, child, childId, setChildId, options } = useChild()
  const payments = state.payments.filter((payment) => payment.studentId === child.id)
  const outstanding = payments.filter((payment) => payment.status === "Pending").reduce((sum, payment) => sum + payment.amount, 0)
  const paid = payments.filter((payment) => payment.status === "Paid").reduce((sum, payment) => sum + payment.amount, 0)
  return (
    <div className="grid gap-5">
      <div className="flex justify-end"><ChildSwitcher childId={childId} onChange={setChildId} options={options} /></div>
      {outstanding === 0 ? <Alert className="border-success/20 bg-success/5"><BadgeCheck className="size-4 text-success" /><AlertTitle>All clear</AlertTitle><AlertDescription>There is no pending receipt for {child.name}.</AlertDescription></Alert> : <Alert><AlertTitle>Payment pending</AlertTitle><AlertDescription>{pkr(outstanding)} is still marked pending by the fee desk.</AlertDescription></Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard icon={WalletCards} label="Outstanding" value={pkr(outstanding)} note="Pending receipts" tone="accent" />
        <MetricCard icon={ReceiptText} label="Paid on record" value={pkr(paid)} note={`${payments.filter((payment) => payment.status === "Paid").length} verified receipts`} />
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Receipt history</CardTitle><CardDescription>Read-only family view</CardDescription></div><Button variant="outline" onClick={() => toast.success("Fee statement prepared")}>Download statement</Button></CardHeader>
        <CardContent>
          {payments.length === 0 ? <EmptyState title="No receipts" detail="Payments recorded for this child will be listed here." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Period</TableHead><TableHead>Paid on</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.ref}>
                    <TableCell className="font-mono text-xs">{payment.ref}</TableCell>
                    <TableCell>{payment.type} · {payment.period}</TableCell>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{pkr(payment.amount)}</TableCell>
                    <TableCell><StatusBadge value={payment.status} /></TableCell>
                    <TableCell><Button variant="ghost" size="icon-sm" onClick={() => toast.success(`Receipt ${payment.ref} downloaded`)}><Download /></Button></TableCell>
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
  const [kind, setKind] = useState("all")
  const updates = state.updates.filter((item) => item.classId === child.classId && item.status === "Published" && (kind === "all" || item.kind === kind))
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <div className="w-full sm:w-40"><Select value={kind} onValueChange={setKind}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All types</SelectItem><SelectItem value="Homework">Homework</SelectItem><SelectItem value="Classwork">Classwork</SelectItem><SelectItem value="Notice">Notice</SelectItem></SelectGroup></SelectContent></Select></div>
        <ChildSwitcher childId={childId} onChange={setChildId} options={options} />
      </div>
      {updates.length === 0 ? <EmptyState title="No published updates" detail="Homework and notices appear after the school publishes them." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {updates.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between"><StatusBadge value={item.kind} /><span className="text-xs text-muted-foreground">{formatDate(item.due)}</span></div>
                <CardTitle className="mt-3 text-base">{item.subject}</CardTitle>
                <CardDescription className="text-sm leading-6 text-foreground/80">{item.text}</CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground"><BadgeCheck className="mr-2 size-4 text-success" />Approved and visible to parents</CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function ParentPortal({ section }: { section: string }) {
  if (section === "attendance") return <ParentAttendance />
  if (section === "results") return <ParentResults />
  if (section === "fees") return <ParentFees />
  if (section === "timetable") return <ParentTimetable />
  if (section === "updates") return <ParentUpdates />
  return <ParentHome />
}
