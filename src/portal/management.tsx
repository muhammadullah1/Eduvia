import { useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Activity,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Clock3,
  CloudUpload,
  CreditCard,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  LibraryBig,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  Users,
  WalletCards,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MANAGEMENT_NAME } from "@/data/session"
import {
  downloadText,
  formatLongDate,
  formatPercent,
  formatPkr,
  formatPkrCompact,
  formatWhen,
  matchesQuery,
} from "@/lib/format"
import {
  balance,
  enrollmentSeries,
  examBoards,
  feeSeries,
  latestReceipts,
  rollup,
  todayAttendanceRate,
} from "@/lib/selectors"
import { useSchool } from "@/lib/school-context"
import type { AdmissionStatus, StudentStatus } from "@/types"

import { toastResult } from "@/portal/feedback"
import {
  EmptyNote,
  MetricCard,
  SectionHeading,
  StatusBadge,
  TextAction,
  type PortalAction,
} from "@/portal/ui"

const chartConfig = {
  students: { label: "Students", color: "var(--chart-1)" },
  collection: { label: "Collected", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ManagementView({
  section,
  query,
  onAction,
  onNavigate,
}: {
  section: string
  query: string
  onAction: (action: PortalAction) => void
  onNavigate: (section: string) => void
}) {
  if (section === "Academic setup") return <AcademicSetup />
  if (section === "Admissions")
    return (
      <Admissions query={query} onAction={onAction} onNavigate={onNavigate} />
    )
  if (section === "Examinations")
    return <Examinations query={query} onAction={onAction} />
  if (section === "Fees & sync")
    return <Fees query={query} onAction={onAction} />
  if (section === "Finance") return <Finance />
  if (section === "Reports & audit") return <Reports query={query} />
  if (section === "SRS delivery map") return <DeliveryMap />
  return <Dashboard query={query} onAction={onAction} onNavigate={onNavigate} />
}

function Dashboard({
  query,
  onAction,
  onNavigate,
}: {
  query: string
  onAction: (action: PortalAction) => void
  onNavigate: (section: string) => void
}) {
  const { state, setUpdateStatus } = useSchool()
  const figures = rollup(state)
  const attendance = todayAttendanceRate(state)
  const pending = state.updates.filter((update) => update.status === "Pending")
  const receipts = latestReceipts(state, 6).filter((receipt) =>
    matchesQuery(query, [
      receipt.id,
      receipt.studentName,
      receipt.type,
      receipt.period,
    ])
  )
  const queue = [
    [String(figures.awaitingReview), "Applications to review", "Admissions"],
    [String(pending.length), "Updates to publish", "Command center"],
    [
      String(
        state.markSheets.filter((sheet) => sheet.status === "Submitted").length
      ),
      "Mark sheets to verify",
      "Examinations",
    ],
    [String(figures.overdueAccounts), "Overdue fee accounts", "Fees & sync"],
  ]
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Active students"
          value={figures.activeStudents.toLocaleString("en-PK")}
          note="Includes the tracked register"
          tone="accent"
        />
        <MetricCard
          icon={UserCheck}
          label="Tracked attendance"
          value={formatPercent(attendance.rate)}
          note={`${attendance.present} present of ${attendance.total} marked today`}
        />
        <MetricCard
          icon={WalletCards}
          label="September collected"
          value={formatPkrCompact(figures.septemberCollected)}
          note={`${formatPercent((figures.septemberCollected / figures.feeTarget) * 100)} of monthly target`}
        />
        <MetricCard
          icon={FileCheck2}
          label="Open applications"
          value={String(figures.openApplications)}
          note={`${figures.awaitingReview} still in review`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Enrollment growth</CardTitle>
              <CardDescription>
                September follows the live active-student count
              </CardDescription>
            </div>
            <Badge variant="outline">Live register</Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[245px] w-full">
              <AreaChart
                data={enrollmentSeries(figures.activeStudents)}
                margin={{ left: 0, right: 8, top: 10 }}
              >
                <defs>
                  <linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-students)"
                      stopOpacity={0.32}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-students)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="students"
                  type="monotone"
                  fill="url(#fillStudents)"
                  stroke="var(--color-students)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attention queue</CardTitle>
            <CardDescription>
              Counts move when you admit, publish, verify, or collect
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            {queue.map(([count, title, section]) => (
              <button
                key={title}
                className="flex items-center gap-3 rounded-xl p-3 text-left hover:bg-muted"
                onClick={() => onNavigate(section)}
              >
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-semibold">
                  {count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {section}
                  </span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Updates waiting for parents</CardTitle>
          <CardDescription>
            Teachers can submit these. Parents only see them after you publish.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {pending.length === 0 ? (
            <EmptyNote
              title="Nothing waiting"
              detail="When a teacher submits classwork or homework, it appears here before families can see it."
            />
          ) : null}
          {pending.map((update) => (
            <div
              key={update.id}
              className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={update.status} />
                  <span className="text-xs text-muted-foreground">
                    {update.className} · {update.subject}
                  </span>
                </div>
                <p className="mt-2 text-sm">{update.text}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toastResult(
                      setUpdateStatus(update.id, "Draft", MANAGEMENT_NAME)
                    )
                  }
                >
                  Return
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    toastResult(
                      setUpdateStatus(update.id, "Published", MANAGEMENT_NAME)
                    )
                  }
                >
                  Publish
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Recent fee activity</CardTitle>
            <CardDescription>
              Desk receipts and synchronised offline payments
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction({ kind: "sync" })}
            >
              <CloudUpload data-icon="inline-start" />
              Offline sync
            </Button>
            <Button size="sm" onClick={() => onAction({ kind: "payment" })}>
              <Plus data-icon="inline-start" />
              Record payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <EmptyNote
              title="No matching receipts"
              detail="Clear the search or record a payment to see it here and on the parent ledger."
            />
          ) : null}
          {receipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono text-xs">
                      {receipt.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {receipt.studentName}
                    </TableCell>
                    <TableCell>
                      {receipt.type} · {receipt.period}
                    </TableCell>
                    <TableCell>{formatPkr(receipt.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge value="Paid" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function AcademicSetup() {
  const figures = rollup(useSchool().state)
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Academic foundation"
        detail="The controlled structure behind every enrollment, class, and report."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [
            CalendarDays,
            "Academic session",
            "2026–27 is current",
            "01 Apr 2026 — 31 Mar 2027",
            `${figures.activeStudents.toLocaleString("en-PK")} active students`,
          ],
          [
            LibraryBig,
            "Classes & sections",
            "Grades Playgroup–10",
            "Tracked sections share one register",
            "Role views read the same classes",
          ],
          [
            BookOpen,
            "Subjects & allocation",
            "Hassan Ali · Mathematics",
            "Grade 6 science is also assigned",
            "Mark sheets follow the allocation",
          ],
        ].map(([Icon, title, big, detail, foot]) => {
          const Glyph = Icon as typeof CalendarDays
          return (
            <Card key={String(title)}>
              <CardHeader>
                <div className="grid size-10 place-items-center rounded-xl bg-muted">
                  <Glyph className="size-5" />
                </div>
                <CardTitle className="mt-5">{title as string}</CardTitle>
                <CardDescription>{detail as string}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-semibold">
                  {big as string}
                </p>
              </CardContent>
              <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
                {foot as string}
              </CardFooter>
            </Card>
          )
        })}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scheduling health</CardTitle>
          <CardDescription>
            Teacher, room, and class checks for the current session
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>
              No blocking conflicts in the tracked timetable
            </AlertTitle>
            <AlertDescription>
              Hassan Ali’s four assigned periods do not overlap.
            </AlertDescription>
          </Alert>
          {[
            ["Teacher allocation", "48 of 52", 92],
            ["Room allocation", "26 of 28", 93],
            ["Timetable coverage", "184 of 190", 97],
          ].map(([label, value, progress]) => (
            <div key={String(label)}>
              <div className="mb-2 flex justify-between text-xs">
                <span>{label}</span>
                <span className="text-muted-foreground">{value}</span>
              </div>
              <Progress value={Number(progress)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Admissions({
  query,
  onAction,
  onNavigate,
}: {
  query: string
  onAction: (action: PortalAction) => void
  onNavigate: (section: string) => void
}) {
  const { state, decideAdmission, activateStudent } = useSchool()
  const figures = rollup(state)
  const [applicationFilter, setApplicationFilter] = useState<
    AdmissionStatus | "All"
  >("All")
  const [studentFilter, setStudentFilter] = useState<StudentStatus | "All">(
    "All"
  )
  const applications = state.admissions.filter(
    (item) =>
      (applicationFilter === "All" || item.status === applicationFilter) &&
      matchesQuery(query, [
        item.id,
        item.name,
        item.guardian,
        item.applyingFor,
        item.status,
      ])
  )
  const students = state.students.filter(
    (student) =>
      (studentFilter === "All" || student.status === studentFilter) &&
      matchesQuery(query, [
        student.id,
        student.name,
        student.guardian,
        student.className,
        student.status,
      ])
  )
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Admissions & student records"
        detail="An approved application becomes a student the teacher and fee desk can use."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={FileCheck2}
          label="Open applications"
          value={String(figures.openApplications)}
          note="Campus total, including this queue"
        />
        <MetricCard
          icon={Clock3}
          label="Awaiting review"
          value={String(figures.awaitingReview)}
          note="New and in-review applications"
        />
        <MetricCard
          icon={BadgeCheck}
          label="Enrolled this month"
          value={String(figures.enrolledThisMonth)}
          note="Rises when you enroll an application"
        />
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              Enroll writes the student into the shared register
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={applicationFilter}
              onValueChange={(value) =>
                setApplicationFilter(value as AdmissionStatus | "All")
              }
            >
              <SelectTrigger className="w-36" aria-label="Filter applications">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[
                    "All",
                    "New",
                    "Review",
                    "Approved",
                    "Enrolled",
                    "Rejected",
                  ].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={() => onAction({ kind: "admission" })}>
              <Plus data-icon="inline-start" />
              New admission
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <EmptyNote
              title="No applications match"
              detail="Change the status filter or clear the search."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.id}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applyingFor}</TableCell>
                    <TableCell>{item.guardian}</TableCell>
                    <TableCell>
                      <StatusBadge value={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === "New" ||
                      item.status === "Review" ||
                      item.status === "Approved" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toastResult(
                                decideAdmission(
                                  item.id,
                                  "reject",
                                  MANAGEMENT_NAME
                                )
                              )
                            }
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              toastResult(
                                decideAdmission(
                                  item.id,
                                  "enroll",
                                  MANAGEMENT_NAME
                                )
                              )
                            }
                          >
                            Enroll
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Student register</CardTitle>
            <CardDescription>
              Named students inside the campus total. Pending students are
              excluded from attendance and fees.
            </CardDescription>
          </div>
          <Select
            value={studentFilter}
            onValueChange={(value) =>
              setStudentFilter(value as StudentStatus | "All")
            }
          >
            <SelectTrigger className="w-36" aria-label="Filter students">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {["All", "Active", "Pending", "Inactive"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <EmptyNote
              title="No students match"
              detail="Try another status, or enroll an application above."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const account = balance(state, student.id)
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">
                        {student.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.className}</TableCell>
                      <TableCell>{student.guardian}</TableCell>
                      <TableCell>{formatPkr(account.outstanding)}</TableCell>
                      <TableCell>
                        <StatusBadge value={student.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {student.status === "Pending" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              toastResult(
                                activateStudent(student.id, MANAGEMENT_NAME)
                              )
                            }
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate("Fees & sync")}
                          >
                            Fees
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Examinations({
  query,
  onAction,
}: {
  query: string
  onAction: (action: PortalAction) => void
}) {
  const { state } = useSchool()
  const [rulesOpen, setRulesOpen] = useState(false)
  const boards = examBoards(state).filter((board) =>
    matchesQuery(query, [board.exam, board.grade, board.status])
  )
  const published = state.markSheets.filter(
    (sheet) => sheet.status === "Published"
  ).length
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Examinations & results"
        detail="Draft, submit, verify, then publish. Published sheets are what parents see."
        action={
          <TextAction onClick={() => setRulesOpen(true)}>
            Grade rules
          </TextAction>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [
            "Tracked sheets",
            String(state.markSheets.length),
            "Subjects in this demo session",
          ],
          ["Published", String(published), "Visible on parent results"],
          [
            "Awaiting verify",
            String(
              state.markSheets.filter((sheet) => sheet.status === "Submitted")
                .length
            ),
            "Locked until you verify or reopen",
          ],
        ].map(([label, value, note]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 font-heading text-3xl font-semibold">
                {value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Exam control room</CardTitle>
            <CardDescription>
              Draft → submitted → verified → published
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => onAction({ kind: "marks" })}>
            <FileCheck2 data-icon="inline-start" />
            Review marks
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {boards.length === 0 ? (
            <EmptyNote
              title="No exam sets match"
              detail="Clear the search to see the control room."
            />
          ) : null}
          {boards.map((board) => (
            <div
              key={board.exam + board.grade}
              className="grid gap-4 rounded-2xl border p-4 md:grid-cols-[1.4fr_1fr_1fr_1.5fr_auto] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold">{board.exam}</p>
                <p className="text-xs text-muted-foreground">{board.grade}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Subjects</p>
                <p className="text-sm font-medium">{board.subjects}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Entered</p>
                <p className="text-sm font-medium">{board.progress}%</p>
              </div>
              <Progress value={board.progress} />
              <StatusBadge value={board.status} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade rules</DialogTitle>
            <DialogDescription>
              Applied when a published sheet is shown to parents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            {[
              ["A+", "90% and above"],
              ["A", "80% – 89%"],
              ["B", "70% – 79%"],
              ["C", "60% – 69%"],
              ["D", "50% – 59%"],
              ["F", "Below 50%"],
            ].map(([grade, band]) => (
              <div
                key={grade}
                className="flex justify-between rounded-xl border px-3 py-2"
              >
                <span className="font-medium">{grade}</span>
                <span className="text-muted-foreground">{band}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Fees({
  query,
  onAction,
}: {
  query: string
  onAction: (action: PortalAction) => void
}) {
  const { state } = useSchool()
  const figures = rollup(state)
  const owing = state.students
    .map((student) => ({ student, account: balance(state, student.id) }))
    .filter(
      (row) =>
        row.account.outstanding > 0 &&
        matchesQuery(query, [
          row.student.name,
          row.student.id,
          row.student.className,
        ])
    )
  const receipts = latestReceipts(state, 12).filter((receipt) =>
    matchesQuery(query, [
      receipt.id,
      receipt.studentName,
      receipt.type,
      receipt.period,
      receipt.source,
    ])
  )
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Fees & offline synchronisation"
        detail="A receipt is rejected when the reference already exists or the student is not active."
      />
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Collection against target</CardTitle>
            <CardDescription>
              September uses the live ledger, in PKR millions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={feeSeries(figures.septemberCollected)}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="collection"
                  fill="var(--color-collection)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="target"
                  fill="var(--color-target)"
                  opacity={0.22}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="border-accent/25 bg-accent/[0.06]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <FileSpreadsheet className="size-5" />
              </div>
              <Badge variant="secondary">Controlled import</Badge>
            </div>
            <CardTitle className="mt-5">Offline fee desk</CardTitle>
            <CardDescription>
              Preview every row. Only valid rows enter the ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {[
              "Load the sample workbook or a CSV",
              "Block duplicate receipt references",
              "Reject unknown, pending, and zero amounts",
              "Skip fees that are already settled",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-background text-xs font-semibold">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => onAction({ kind: "sync" })}
            >
              <CloudUpload data-icon="inline-start" />
              Review and import
            </Button>
          </CardFooter>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Outstanding in the tracked register</CardTitle>
            <CardDescription>
              {figures.overdueAccounts} campus accounts are overdue, including
              the rows below
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              onAction({ kind: "payment", studentId: owing[0]?.student.id })
            }
          >
            <Plus data-icon="inline-start" />
            Record payment
          </Button>
        </CardHeader>
        <CardContent>
          {owing.length === 0 ? (
            <EmptyNote
              title="No outstanding balances"
              detail="Every tracked student is settled for the charges currently on the ledger."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {owing.map((row) => (
                  <TableRow key={row.student.id}>
                    <TableCell className="font-medium">
                      {row.student.name}
                    </TableCell>
                    <TableCell>{row.student.className}</TableCell>
                    <TableCell>{formatPkr(row.account.outstanding)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onAction({
                            kind: "payment",
                            studentId: row.student.id,
                          })
                        }
                      >
                        Collect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent receipts</CardTitle>
          <CardDescription>
            The same references a parent can download
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <EmptyNote
              title="No matching receipts"
              detail="Record a payment or import the sample workbook."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono text-xs">
                      {receipt.id}
                    </TableCell>
                    <TableCell>{receipt.studentName}</TableCell>
                    <TableCell>
                      {receipt.type} · {receipt.period}
                    </TableCell>
                    <TableCell>{formatPkr(receipt.amount)}</TableCell>
                    <TableCell>
                      {receipt.source === "sync" ? "Offline sync" : "Desk"}
                    </TableCell>
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

function Finance() {
  const { state } = useSchool()
  const figures = rollup(state)
  const net = figures.septemberCollected - figures.expenses
  const exportStatement = () => {
    const lines = [
      "Item,Amount",
      `September income,${figures.septemberCollected}`,
      `Expenses,${figures.expenses}`,
      `Net,${net}`,
      `Advances,${figures.advances}`,
    ]
    downloadText("finance-september-2026.csv", lines.join("\n"), "text/csv")
  }
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Finance overview"
        detail="Income follows the fee ledger. Expenses stay the posted campus figure."
        action={
          <TextAction onClick={exportStatement}>Export statement</TextAction>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={WalletCards}
          label="Income this month"
          value={formatPkrCompact(figures.septemberCollected)}
          note="Fees collected in September"
          tone="accent"
        />
        <MetricCard
          icon={CreditCard}
          label="Expenses"
          value={formatPkrCompact(figures.expenses)}
          note="Posted campus expenses"
        />
        <MetricCard
          icon={Landmark}
          label="Net position"
          value={formatPkrCompact(net)}
          note="Income minus posted expenses"
        />
        <MetricCard
          icon={ReceiptText}
          label="Advances held"
          value={formatPkrCompact(figures.advances)}
          note="Campus advances plus named overpayments"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Latest income lines</CardTitle>
          <CardDescription>
            Taken from receipts in the shared ledger
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {latestReceipts(state, 5).map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center gap-3 rounded-xl border p-3"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-muted">
                <ReceiptText className="size-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">
                  {receipt.studentName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {receipt.id} · {formatLongDate(receipt.paidOn)}
                </span>
              </span>
              <span className="text-sm font-semibold">
                + {formatPkr(receipt.amount)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Reports({ query }: { query: string }) {
  const { state } = useSchool()
  const figures = rollup(state)
  const [report, setReport] = useState<string | null>(null)
  const library = [
    [Users, "Enrollment register", "Active students in the tracked register"],
    [UserCheck, "Attendance summary", "Marks saved for the current school day"],
    [WalletCards, "Fee outstanding", "Students who still owe a charge"],
    [FileCheck2, "Exam analytics", "Sheet status across the control room"],
    [Landmark, "Income & expense", "September income, expenses, and net"],
    [
      FileSpreadsheet,
      "Offline sync log",
      "Import and duplicate events from the audit trail",
    ],
  ] as const
  const audit = state.audit.filter((event) =>
    matchesQuery(query, [event.actor, event.action, event.id])
  )
  const preview = reportPreview(report, state, figures)
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Reports & audit"
        detail="Reports are calculated from the same records the other roles use."
      />
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Report library</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent
          value="reports"
          className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {library.map(([Icon, title, detail]) => (
            <Card
              key={title}
              className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => setReport(title)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-muted">
                    <Icon className="size-5" />
                  </span>
                  <Download className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-5">{title}</CardTitle>
                <CardDescription>{detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="audit" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Security audit trail</CardTitle>
              <CardDescription>
                New admissions, payments, attendance, updates, and mark-sheet
                decisions are appended here
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1">
              {audit.length === 0 ? (
                <EmptyNote
                  title="No audit rows match"
                  detail="Clear the search to see the full trail."
                />
              ) : null}
              {audit.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 border-b py-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{event.actor}</span>{" "}
                      {event.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.id} · {formatWhen(event.at)}
                    </p>
                  </div>
                  <Badge variant="outline">Recorded</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog
        open={report !== null}
        onOpenChange={(open) => !open && setReport(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{report}</DialogTitle>
            <DialogDescription>
              Preview from the current school session.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-4 text-xs leading-5 whitespace-pre-wrap">
            {preview}
          </pre>
          <Button
            onClick={() => {
              if (!report) return
              downloadText(
                `${report.toLowerCase().replaceAll(" ", "-")}.txt`,
                preview
              )
            }}
          >
            <Download data-icon="inline-start" />
            Download
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function reportPreview(
  report: string | null,
  state: ReturnType<typeof useSchool>["state"],
  figures: ReturnType<typeof rollup>
) {
  if (report === "Enrollment register") {
    return state.students
      .map(
        (student) =>
          `${student.id}  ${student.name}  ${student.className}  ${student.status}`
      )
      .join("\n")
  }
  if (report === "Attendance summary") {
    const today = state.attendance.filter((mark) => mark.date === "2026-09-24")
    const present = today.filter((mark) => mark.status === "Present").length
    return `School day 2026-09-24\nPresent ${present}\nAbsent ${today.filter((mark) => mark.status === "Absent").length}\nLeave ${today.filter((mark) => mark.status === "Leave").length}\nMarked ${today.length}`
  }
  if (report === "Fee outstanding") {
    const rows = state.students
      .map((student) => ({
        student,
        outstanding: balance(state, student.id).outstanding,
      }))
      .filter((row) => row.outstanding > 0)
    return (
      rows
        .map((row) => `${row.student.name}  ${formatPkr(row.outstanding)}`)
        .join("\n") || "No outstanding balances."
    )
  }
  if (report === "Exam analytics") {
    return state.markSheets
      .map(
        (sheet) =>
          `${sheet.status.padEnd(10)}  ${sheet.exam} · ${sheet.className} · ${sheet.subject}`
      )
      .join("\n")
  }
  if (report === "Income & expense") {
    return `September income ${formatPkr(figures.septemberCollected)}\nExpenses ${formatPkr(figures.expenses)}\nNet ${formatPkr(figures.septemberCollected - figures.expenses)}`
  }
  if (report === "Offline sync log") {
    const rows = state.audit.filter((event) =>
      /import|duplicate|receipt/i.test(event.action)
    )
    return (
      rows
        .map(
          (event) => `${formatWhen(event.at)}  ${event.actor}  ${event.action}`
        )
        .join("\n") || "No sync events yet."
    )
  }
  return ""
}

function DeliveryMap() {
  return (
    <div className="grid gap-6">
      <div className="max-w-3xl">
        <Badge variant="secondary">SRS v2 coverage</Badge>
        <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          One product, delivered in three confident phases.
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Management, teachers, and parents share one in-browser school session.
          Publishing a mark sheet, recording a receipt, or saving attendance
          changes what the other roles see.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [
            "Phase 01",
            "Internal management",
            "Admissions, exams, fees, finance, reporting, and controlled offline fee sync.",
          ],
          [
            "Phase 02",
            "Teacher portal",
            "Assigned classes, attendance, lessons, homework, and locked mark submission.",
          ],
          [
            "Phase 03",
            "Parent portal",
            "Linked children, attendance, published results, receipts, timetable, and approved updates.",
          ],
        ].map(([phase, title, detail], index) => (
          <Card key={phase} className={index === 0 ? "border-primary/20" : ""}>
            <CardHeader>
              <Badge variant={index === 0 ? "default" : "secondary"}>
                {phase}
              </Badge>
              <CardTitle className="mt-5 text-xl">{title}</CardTitle>
              <CardDescription className="leading-6">{detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={100} />
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success">
                <BadgeCheck className="size-4" />
                Represented in this prototype
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cross-cutting controls</CardTitle>
          <CardDescription>
            Rules the shared session actually enforces
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            [
              ShieldCheck,
              "Role permissions",
              "Parents only see published results and published updates.",
            ],
            [
              FileCheck2,
              "Controlled approvals",
              "Submitted marks stay locked until management reopens them.",
            ],
            [
              ReceiptText,
              "Ledger integrity",
              "Duplicate references and non-positive amounts never post.",
            ],
            [
              Activity,
              "Live calculation",
              "Dashboard totals move when the underlying records change.",
            ],
          ].map(([Icon, title, detail]) => {
            const Glyph = Icon as typeof ShieldCheck
            return (
              <div
                key={title as string}
                className="rounded-2xl bg-muted/50 p-4"
              >
                <Glyph className="size-5 text-primary" />
                <p className="mt-4 text-sm font-semibold">{title as string}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {detail as string}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
