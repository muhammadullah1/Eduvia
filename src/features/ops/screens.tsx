import { useMemo, useState } from "react"
import { AlertTriangle, BookOpen, CalendarClock, ClipboardList, GraduationCap, ShieldAlert, WalletCards } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { studentName, useSchool } from "@/data/store"
import { MONTHLY_TEST_RULES, type AbsenceStatus } from "@/data/types"
import { pkr } from "@/lib/format"
import { Fees, Finance, Examinations, AcademicSetup, Reports } from "@/features/management/screens"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader>
      {note ? <CardContent><p className="text-xs text-muted-foreground">{note}</p></CardContent> : null}
    </Card>
  )
}

/** Accountant portal — fee desk aligned with parent-visible ledger fields. */
export function AccountantPortal({ section }: { section: string }) {
  if (section === "finance") return <Finance />
  if (section === "reports") return <Reports onReset={() => toast.message("Ask management to reset the demo")} />
  return <AccountantFees />
}

function AccountantFees() {
  const { state, addPayment, setPaymentStatus } = useSchool()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    studentId: "",
    period: "September 2026",
    type: "Tuition",
    amount: "8500",
    method: "Cash",
    ref: "",
  })

  const outstanding = state.payments.filter((p) => p.status === "Pending")
  const paid = state.payments.filter((p) => p.status === "Paid")

  return (
    <div className="grid gap-4">
      <Alert>
        <WalletCards className="size-4" />
        <AlertTitle>Fee desk (parent-aligned)</AlertTitle>
        <AlertDescription>
          Receipts use the same fields parents see: student, period, type, amount, method, status and date.
          Unpaid periods block published results unless a controller/management override is recorded.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Paid receipts" value={String(paid.length)} note={pkr(paid.reduce((s, p) => s + p.amount, 0))} />
        <Metric label="Outstanding" value={String(outstanding.length)} note={pkr(outstanding.reduce((s, p) => s + p.amount, 0))} />
        <Metric label="Students on ledger" value={String(new Set(state.payments.map((p) => p.studentId)).size)} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Fee ledger</CardTitle>
            <CardDescription>Mirror of the parent Fees & receipts view</CardDescription>
          </div>
          <Button onClick={() => { setError(""); setOpen(true) }}>Add fee</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Period / type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.payments.map((payment) => (
                <TableRow key={payment.ref}>
                  <TableCell className="font-mono text-xs">{payment.ref}</TableCell>
                  <TableCell>{studentName(state.students, payment.studentId)}</TableCell>
                  <TableCell>{payment.type} · {payment.period}</TableCell>
                  <TableCell>{pkr(payment.amount)}</TableCell>
                  <TableCell><Badge variant={payment.status === "Paid" ? "default" : "secondary"}>{payment.status}</Badge></TableCell>
                  <TableCell>
                    {payment.status === "Pending" ? (
                      <Button size="sm" variant="outline" onClick={() => { setPaymentStatus(payment.ref, "Paid", "Nadia Iqbal"); toast.success("Marked paid") }}>Confirm paid</Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add fee (parent portal fields)</DialogTitle>
            <DialogDescription>Period and amount must match what families expect to see.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Student">
                <Select value={form.studentId} onValueChange={(studentId) => setForm({ ...form, studentId })}>
                  <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                  <SelectContent><SelectGroup>{state.students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.id}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Period">
              <Select value={form.period} onValueChange={(period) => setForm({ ...form, period })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{["August 2026", "September 2026", "October 2026"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onValueChange={(type) => setForm({ ...form, type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{["Tuition", "Transport", "Admission"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field label="Amount"><Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Method">
              <Select value={form.method} onValueChange={(method) => setForm({ ...form, method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank transfer">Bank transfer</SelectItem></SelectGroup></SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Receipt reference"><Input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="RCPT-0926-500" /></Field></div>
            {error ? <p className="sm:col-span-2 text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              const message = addPayment({ ...form, amount: Number(form.amount), ref: form.ref }, "Nadia Iqbal")
              if (message) { setError(message); toast.error(message) }
              else { toast.success("Fee added"); setOpen(false); setForm({ ...form, ref: "" }) }
            }}>Save fee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Controller portal — oversight for absences, monthly tests, fee-gated results. */
export function ControllerPortal({ section, onOpen }: { section: string; onOpen: (id: string) => void }) {
  if (section === "academic") return <AcademicSetup />
  if (section === "exams") return <Examinations />
  if (section === "fees") return <Fees query="" />
  if (section === "monthly") return <MonthlyTestsPanel />
  if (section === "absences") return <AbsencesPanel />
  if (section === "results-gate") return <ResultsGatePanel />
  if (section === "reports") return <Reports onReset={() => toast.message("Ask management to reset the demo")} />
  return <ControllerOversight onOpen={onOpen} />
}

function ControllerOversight({ onOpen }: { onOpen: (id: string) => void }) {
  const { state } = useSchool()
  const blocked = state.sheets.flatMap((sheet) =>
    sheet.status === "Published"
      ? sheet.rows.filter((row) => row.blockedByFee && !row.manualOverride).map((row) => ({ sheet, row }))
      : [],
  )
  const failed = state.monthlySummaries.filter((s) => s.status === "Failed")
  const low = state.monthlySummaries.filter((s) => s.status === "LowMarks")
  const unmanaged = state.teacherAbsences.filter((a) => a.status === "Unmanaged" || a.status === "Absent")

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Fee-blocked results" value={String(blocked.length)} note="Need override or payment" />
        <Metric label="Monthly failed" value={String(failed.length)} note="≥ 2 failed tests" />
        <Metric label="Low marks" value={String(low.length)} note="≥ 3 passed, avg &lt; 55%" />
        <Metric label="Open absences" value={String(unmanaged.length)} note="Cover or cancel" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          { id: "absences", title: "Absent teacher periods", icon: CalendarClock },
          { id: "monthly", title: "Monthly test management", icon: ClipboardList },
          { id: "results-gate", title: "Result fee gate", icon: ShieldAlert },
          { id: "exams", title: "Examinations", icon: GraduationCap },
          { id: "academic", title: "Academic setup", icon: BookOpen },
          { id: "fees", title: "Fees oversight", icon: WalletCards },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} onClick={() => onOpen(item.id)} className="rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/30">
              <Icon className="mb-3 size-5 text-primary" />
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open controller workspace</p>
            </button>
          )
        })}
      </div>
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="size-4" />
        <AlertTitle>Rules in force</AlertTitle>
        <AlertDescription>
          Pass mark {MONTHLY_TEST_RULES.PASS_PERCENT}%. Two failed monthly tests ⇒ Failed.
          Three or more passed with average below {MONTHLY_TEST_RULES.LOW_MARKS_CEILING_PERCENT}% ⇒ Low marks.
          Unpublished fee periods keep parent results hidden unless manually overridden.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export function AbsencesPanel() {
  const { state, addTeacherAbsence, updateTeacherAbsence } = useSchool()
  const teachers = state.staff.filter((s) => s.role === "Teacher" || s.subjects.length)
  const [form, setForm] = useState({
    teacherId: teachers[0]?.id ?? "",
    classId: state.classes[0]?.id ?? "",
    date: "2026-09-24",
    periodIndex: "1",
    status: "Absent" as AbsenceStatus,
    notes: "",
  })

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader><CardTitle>Record absence</CardTitle><CardDescription>Tie to class period index (1…N)</CardDescription></CardHeader>
        <CardContent className="grid gap-3">
          <Field label="Teacher">
            <Select value={form.teacherId} onValueChange={(teacherId) => setForm({ ...form, teacherId })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field label="Class">
            <Select value={form.classId} onValueChange={(classId) => setForm({ ...form, classId })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{state.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label} · {c.periodCount} periods</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Period index"><Input value={form.periodIndex} onChange={(e) => setForm({ ...form, periodIndex: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(status) => setForm({ ...form, status: status as AbsenceStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{(["Absent", "Covered", "Cancelled", "Unmanaged"] as AbsenceStatus[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button onClick={() => {
            const teacher = teachers.find((t) => t.id === form.teacherId)
            const message = addTeacherAbsence({
              teacherId: form.teacherId,
              teacherName: teacher?.name ?? form.teacherId,
              classId: form.classId,
              date: form.date,
              periodIndex: Number(form.periodIndex) || 1,
              status: form.status,
              notes: form.notes,
            }, "Imran Shah")
            if (message) toast.error(message)
            else toast.success("Absence recorded")
          }}>Save</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Period absences</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Teacher</TableHead><TableHead>Class</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {state.teacherAbsences.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.teacherName}</TableCell>
                  <TableCell>{state.classes.find((c) => c.id === row.classId)?.label ?? row.classId}</TableCell>
                  <TableCell>P{row.periodIndex}</TableCell>
                  <TableCell><Badge>{row.status}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { updateTeacherAbsence(row.id, { status: "Covered", coverTeacherName: "Mariam Khan", coverTeacherId: "st-mariam" }, "Imran Shah"); toast.success("Marked covered") }}>Cover</Button>
                    <Button size="sm" variant="ghost" onClick={() => { updateTeacherAbsence(row.id, { status: "Cancelled" }, "Imran Shah"); toast.success("Period cancelled") }}>Cancel</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function MonthlyTestsPanel() {
  const { state } = useSchool()
  return (
    <div className="grid gap-4">
      <Alert>
        <ClipboardList className="size-4" />
        <AlertTitle>Monthly test rules</AlertTitle>
        <AlertDescription>
          Pass ≥ {MONTHLY_TEST_RULES.PASS_PERCENT}%. {MONTHLY_TEST_RULES.FAIL_TEST_COUNT} failed tests ⇒ student Failed for the month/subject.
          If {MONTHLY_TEST_RULES.LOW_MARKS_PASS_COUNT}+ tests are passed but average &lt; {MONTHLY_TEST_RULES.LOW_MARKS_CEILING_PERCENT}%, status is Low marks.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader><CardTitle>September 2026 summaries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Taken</TableHead><TableHead>Passed</TableHead><TableHead>Failed</TableHead><TableHead>Avg %</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {state.monthlySummaries.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{studentName(state.students, row.studentId)}</TableCell>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell>{row.testsTaken}</TableCell>
                  <TableCell>{row.passedCount}</TableCell>
                  <TableCell>{row.failedCount}</TableCell>
                  <TableCell>{row.averagePercent}</TableCell>
                  <TableCell><Badge variant={row.status === "Failed" ? "destructive" : row.status === "LowMarks" ? "secondary" : "default"}>{row.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Monthly tests</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {state.monthlyTests.map((test) => (
            <div key={test.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{test.title}</p>
                  <p className="text-xs text-muted-foreground">{test.subject} · {test.month} · pass {test.passPercent}%</p>
                </div>
                <Badge variant="outline">{test.results.length} scores</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function ResultsGatePanel() {
  const { state, overrideResultFeeGate } = useSchool()
  const [reason, setReason] = useState("Fee waiver approved by controller")
  const rows = useMemo(() => state.sheets.flatMap((sheet) =>
    sheet.rows
      .filter((row) => sheet.status === "Published" || row.blockedByFee || row.manualOverride)
      .map((row) => ({ sheet, row })),
  ), [state.sheets])

  return (
    <div className="grid gap-4">
      <Alert className="border-destructive/20 bg-destructive/5">
        <ShieldAlert className="size-4" />
        <AlertTitle>Fee gate on published results</AlertTitle>
        <AlertDescription>
          Students without a Paid fee for the sheet&apos;s fee period stay hidden from the parent portal.
          Controllers/management can override with a reason.
        </AlertDescription>
      </Alert>
      <Field label="Override reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader><TableRow><TableHead>Exam</TableHead><TableHead>Student</TableHead><TableHead>Fee period</TableHead><TableHead>Score</TableHead><TableHead>Gate</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map(({ sheet, row }) => (
                <TableRow key={`${sheet.id}-${row.studentId}`}>
                  <TableCell>{sheet.examName} · {sheet.subject}</TableCell>
                  <TableCell>{studentName(state.students, row.studentId)}</TableCell>
                  <TableCell>{sheet.feePeriod ?? "—"}</TableCell>
                  <TableCell>{row.score ?? "—"}</TableCell>
                  <TableCell>
                    {row.manualOverride ? <Badge>Override</Badge> : row.blockedByFee ? <Badge variant="destructive">Blocked</Badge> : row.visibleToParent ? <Badge>Visible</Badge> : <Badge variant="secondary">Hidden</Badge>}
                  </TableCell>
                  <TableCell>
                    {!row.manualOverride && (row.blockedByFee || !row.visibleToParent) ? (
                      <Button size="sm" variant="outline" onClick={() => {
                        const message = overrideResultFeeGate(sheet.id, row.studentId, reason, "Imran Shah")
                        if (message) toast.error(message)
                        else toast.success("Override saved")
                      }}>Override</Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export function DailyTestsTeacherPanel() {
  const { state, saveDailyTestResults } = useSchool()
  const test = state.dailyTests[0]
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries((test?.results ?? []).map((r) => [r.studentId, r.score == null ? "" : String(r.score)])),
  )
  if (!test) return <Alert><AlertTitle>No daily tests</AlertTitle><AlertDescription>Management has not scheduled a daily test yet.</AlertDescription></Alert>
  const students = state.students.filter((s) => s.classId === test.classId)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{test.title}</CardTitle>
        <CardDescription>{test.subject} · {test.date} · max {test.max}{test.periodIndex ? ` · P${test.periodIndex}` : ""}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {students.map((student) => (
          <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
            <span className="text-sm font-medium">{student.name}</span>
            <Input className="w-24" value={scores[student.id] ?? ""} onChange={(e) => setScores({ ...scores, [student.id]: e.target.value })} />
          </div>
        ))}
        <Button onClick={() => {
          const results = students.map((student) => ({
            studentId: student.id,
            score: scores[student.id] === "" || scores[student.id] == null ? null : Number(scores[student.id]),
          }))
          const message = saveDailyTestResults(test.id, results, "Hassan Ali")
          if (message) toast.error(message)
          else toast.success("Daily test results updated")
        }}>Save daily results</Button>
      </CardContent>
    </Card>
  )
}
