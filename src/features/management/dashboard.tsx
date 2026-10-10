import { FileCheck2, UserCheck, Users, WalletCards } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { MetricCard, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { studentName, useSchool } from "@/data/store"
import { isAttendancePresent } from "@/data/types"
import { feeMonthsLabel } from "@/features/fees/receipts"
import { getToday } from "@/lib/dates"
import { monthLabel, outstanding } from "@/lib/fees"
import { pkr } from "@/lib/format"

import { chartConfig, monthsThroughToday } from "./shared"

export function ManagementDashboard({
  onOpen,
}: {
  onOpen: (section: string) => void
}) {
  const { state } = useSchool()
  const today = getToday()
  const thisMonth = today.slice(0, 7)
  const currentSession = state.sessions.find((session) => session.current)
  const active = state.students.filter(
    (student) => student.status === "Active"
  ).length
  const inactive = state.students.filter(
    (student) => student.status !== "Active"
  ).length
  const teachers = state.staff.filter((person) =>
    person.role.toLowerCase().includes("teacher")
  ).length
  const presentToday = state.attendance.filter(
    (mark) => mark.date === today && isAttendancePresent(mark.status)
  ).length
  const markedToday = state.attendance.filter(
    (mark) => mark.date === today
  ).length
  // Overall fee totals: super admin only (UR-01). The dashboard is not mounted for other roles.
  const collectedThisMonth = state.payments
    .filter(
      (payment) =>
        payment.date.startsWith(thisMonth) && payment.status === "Paid"
    )
    .reduce((sum, payment) => sum + payment.amount, 0)
  const unpaid = state.feeMonths
    .filter((month) => month.month <= thisMonth)
    .reduce((sum, month) => sum + outstanding(month), 0)
  const enrollmentMonths = monthsThroughToday(currentSession?.start || today)
  const openApps = state.applications.filter(
    (item) => item.status === "New" || item.status === "Review"
  ).length
  const pendingMarks = state.sheets.filter(
    (sheet) => sheet.status === "Draft" || sheet.status === "Submitted"
  ).length
  const classDistribution = state.classes.map((item) => ({
    class: item.label,
    students: state.students.filter(
      (student) => student.classId === item.id && student.status === "Active"
    ).length,
  }))
  const enrollment = enrollmentMonths.map((month) => ({
    month: monthLabel(month).slice(0, 3),
    students: state.students.filter(
      (student) =>
        student.status === "Active" && student.admittedOn.slice(0, 7) <= month
    ).length,
  }))
  const queue = [
    {
      count: openApps,
      title: "Applications to review",
      tag: "Admissions",
      section: "admissions",
    },
    {
      count: state.sheets.filter((sheet) => sheet.status === "Submitted")
        .length,
      title: "Marks awaiting verification",
      tag: "Exams",
      section: "exams",
    },
    {
      count: state.payments.filter((payment) => payment.status === "Pending")
        .length,
      title: "Unconfirmed payments",
      tag: "Fees",
      section: "fees",
    },
    {
      count: state.updates.filter(
        (item) => item.status === "Draft" || item.status === "Approved"
      ).length,
      title: "Updates to publish",
      tag: "Messages",
      section: "messages",
    },
  ]

  return (
    <div className="grid gap-6">
      <Card className="border-[var(--primary-color)]/15 bg-[var(--secondary-color)]/60">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[var(--primary-color)] uppercase">
              Academic summary
            </p>
            <p className="mt-1 text-[20px] font-semibold text-[var(--heading)]">
              {currentSession?.name ?? "No active session"}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentSession
                ? `${currentSession.start} to ${currentSession.end}`
                : "Create a session in Academic setup."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center sm:min-w-[280px]">
            <div>
              <p className="text-2xl font-semibold text-[var(--primary-color)]">
                {state.classes.length}
              </p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--primary-color)]">
                {state.subjects.length}
              </p>
              <p className="text-xs text-muted-foreground">Subjects</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[var(--primary-color)]">
                {teachers}
              </p>
              <p className="text-xs text-muted-foreground">Teachers</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Active students"
          value={active.toLocaleString("en-PK")}
          note={`${inactive} inactive / withdrawn`}
          tone="accent"
        />
        <MetricCard
          icon={UserCheck}
          label="Today’s attendance"
          value={
            markedToday
              ? `${Math.round((presentToday / markedToday) * 1000) / 10}%`
              : "—"
          }
          note={`${presentToday} present today`}
        />
        <MetricCard
          icon={WalletCards}
          label={`${monthLabel(thisMonth)} collected`}
          value={pkr(collectedThisMonth)}
          note={`${pkr(unpaid)} still outstanding`}
        />
        <MetricCard
          icon={FileCheck2}
          label="Pending marks sheets"
          value={String(pendingMarks)}
          note={`${openApps} open admissions`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment growth</CardTitle>
            <CardDescription>Current session student strength</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[245px] w-full">
              <AreaChart
                data={enrollment}
                margin={{ left: 0, right: 8, top: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="students"
                  type="monotone"
                  fill="var(--color-students)"
                  fillOpacity={0.16}
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
            <CardDescription>Items that need a decision</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            {queue.map((item) => (
              <button
                key={item.title}
                onClick={() => onOpen(item.section)}
                className="flex items-center gap-3 rounded-xl p-3 text-left hover:bg-muted"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-semibold">
                  {item.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.tag}
                  </span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student distribution by class</CardTitle>
            <CardDescription>Active students per section</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[245px] w-full">
              <BarChart
                data={classDistribution}
                margin={{ left: 0, right: 8, top: 10 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="class"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="students"
                  fill="var(--color-students)"
                  radius={6}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee position</CardTitle>
            <CardDescription>
              Collected this month versus all monthly fees still due
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Collected this month
              </span>
              <span className="font-semibold text-[var(--primary-color)]">
                {pkr(collectedThisMonth)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-background px-4 py-3">
              <span className="text-sm text-muted-foreground">Outstanding</span>
              <span className="font-semibold">{pkr(unpaid)}</span>
            </div>
            <Progress
              value={
                collectedThisMonth + unpaid
                  ? Math.round(
                      (collectedThisMonth / (collectedThisMonth + unpaid)) * 100
                    )
                  : 0
              }
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {collectedThisMonth + unpaid
                ? Math.round(
                    (collectedThisMonth / (collectedThisMonth + unpaid)) * 100
                  )
                : 0}
              % of tracked fee value is paid.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent fee activity</CardTitle>
            <CardDescription>Newest receipts in the ledger</CardDescription>
          </div>
          <Button size="sm" onClick={() => onOpen("fees")}>
            Open fees
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Fee months</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.payments.slice(0, 5).map((row) => (
                <TableRow key={row.ref}>
                  <TableCell className="font-mono text-xs">{row.ref}</TableCell>
                  <TableCell className="font-medium">
                    {studentName(state.students, row.studentId)}
                  </TableCell>
                  <TableCell>{feeMonthsLabel(row)}</TableCell>
                  <TableCell>{pkr(row.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} />
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
