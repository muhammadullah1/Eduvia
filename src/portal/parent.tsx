import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Download,
  GraduationCap,
  ReceiptText,
  UserCheck,
  WalletCards,
} from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PARENT_NAME, SESSION_TODAY, septemberDates } from "@/data/session"
import {
  downloadText,
  formatLongDate,
  formatPercent,
  formatPkr,
  isWeekend,
  letterGrade,
  matchesQuery,
} from "@/lib/format"
import {
  attendanceFor,
  balance,
  homeworkDue,
  parentChildren,
  publishedResults,
  studentTimetable,
  visibleUpdates,
} from "@/lib/selectors"
import { useSchool } from "@/lib/school-context"

import { downloadChildDmc } from "@/portal/dmc"
import {
  EmptyNote,
  MetricCard,
  SectionHeading,
  StatusBadge,
  TextAction,
} from "@/portal/ui"

const attendanceConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  absent: { label: "Absent", color: "var(--chart-4)" },
  leave: { label: "Leave", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ParentView({
  section,
  childId,
  onChild,
  query,
}: {
  section: string
  childId: string
  onChild: (id: string) => void
  query: string
}) {
  const { state } = useSchool()
  const children = parentChildren(state, PARENT_NAME)
  const child =
    children.find((student) => student.id === childId) ?? children[0]
  if (!child)
    return (
      <EmptyNote
        title="No linked children"
        detail="This parent account does not have a child in the register."
      />
    )
  if (section === "Attendance") return <Attendance childId={child.id} />
  if (section === "Results & DMC") return <Results childId={child.id} />
  if (section === "Fees & receipts") return <Fees childId={child.id} />
  if (section === "Timetable") return <Timetable childId={child.id} />
  if (section === "Updates") return <Updates childId={child.id} query={query} />
  return (
    <Home
      childId={child.id}
      childrenIds={children.map((student) => student.id)}
      onChild={onChild}
    />
  )
}

function useChild(childId: string) {
  const { state } = useSchool()
  const child = state.students.find((student) => student.id === childId)
  if (!child) throw new Error("Missing child")
  return { state, child }
}

function Home({
  childId,
  childrenIds,
  onChild,
}: {
  childId: string
  childrenIds: string[]
  onChild: (id: string) => void
}) {
  const { state, child } = useChild(childId)
  const summary = attendanceFor(state, child.id)
  const results = publishedResults(state, child)
  const latest = results[0]
  const account = balance(state, child.id)
  const due = homeworkDue(state, child.className)
  const today = state.attendance.find(
    (mark) => mark.studentId === child.id && mark.date === SESSION_TODAY
  )
  const periods = studentTimetable(child.className).slice(0, 4)
  const updates = visibleUpdates(state, child.className).slice(0, 3)
  const dayIndex = new Date(`${SESSION_TODAY}T12:00:00Z`).getUTCDay()
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-center gap-5">
          <Avatar className="size-16 border-4 border-background shadow-md">
            <AvatarFallback className="bg-accent text-lg text-accent-foreground">
              {initials(child.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-2xl font-semibold">
                {child.name}
              </h2>
              <Badge variant="secondary">
                <BadgeCheck className="size-3" />
                {child.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {child.className} · {child.id}
            </p>
          </div>
        </div>
        <Select value={child.id} onValueChange={onChild}>
          <SelectTrigger className="w-full md:w-64" aria-label="Linked child">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {childrenIds.map((id) => {
                const student = state.students.find((item) => item.id === id)
                return (
                  <SelectItem key={id} value={id}>
                    {student?.name} · {student?.className}
                  </SelectItem>
                )
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UserCheck}
          label="September attendance"
          value={formatPercent(summary.rate)}
          note={`${summary.present} present of ${summary.total} days`}
          tone="accent"
        />
        <MetricCard
          icon={GraduationCap}
          label="Latest published result"
          value={latest ? formatPercent(latest.overall) : "—"}
          note={
            latest
              ? `Rank ${latest.rank} of ${latest.cohort}`
              : "Nothing published yet"
          }
        />
        <MetricCard
          icon={WalletCards}
          label="Fee status"
          value={
            account.outstanding > 0 ? formatPkr(account.outstanding) : "Paid"
          }
          note={
            account.outstanding > 0
              ? "Outstanding on the ledger"
              : "No outstanding balance"
          }
        />
        <MetricCard
          icon={BookOpen}
          label="Homework"
          value={String(due.length).padStart(2, "0")}
          note="Published and still due"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today at school</CardTitle>
            <CardDescription>
              {formatLongDate(SESSION_TODAY)} · day mark{" "}
              {today?.status ?? "Not marked"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {periods.map((row) => (
              <div
                key={row[0]}
                className="flex items-center gap-4 rounded-xl border p-3"
              >
                <p className="w-12 text-xs font-semibold">{row[0]}</p>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {row[dayIndex] ?? row[1]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {child.className}
                  </p>
                </div>
                <StatusBadge value={today?.status ?? "Upcoming"} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest updates</CardTitle>
            <CardDescription>
              Published for {child.className} and the whole school
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {updates.length === 0 ? (
              <EmptyNote
                title="No published updates"
                detail="Homework and notices appear here after the school publishes them."
              />
            ) : null}
            {updates.map((update) => (
              <div
                key={update.id}
                className="border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{update.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {update.subject}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6">{update.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Attendance({ childId }: { childId: string }) {
  const { state, child } = useChild(childId)
  const summary = attendanceFor(state, child.id)
  const slices = [
    { name: "Present", value: summary.present, fill: "var(--color-present)" },
    { name: "Absent", value: summary.absent, fill: "var(--color-absent)" },
    { name: "Leave", value: summary.leave, fill: "var(--color-leave)" },
  ].filter((slice) => slice.value > 0)
  const byDate = new Map(summary.marks.map((mark) => [mark.date, mark.status]))
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Attendance"
        detail={`${child.name} · September 2026 · saved by the class teacher.`}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>September summary</CardTitle>
            <CardDescription>
              {summary.total} marked instructional days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slices.length === 0 ? (
              <EmptyNote
                title="No attendance yet"
                detail="The calendar fills in when the teacher saves the class."
              />
            ) : (
              <ChartContainer
                config={attendanceConfig}
                className="mx-auto h-[250px] max-w-sm"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" />}
                  />
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={96}
                    strokeWidth={4}
                  >
                    {slices.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [summary.present, "Present"],
                [summary.absent, "Absent"],
                [summary.leave, "Leave"],
              ].map(([value, label]) => (
                <div key={String(label)} className="rounded-xl bg-muted p-3">
                  <p className="font-heading text-xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>September calendar</CardTitle>
            <CardDescription>
              Weekends are quiet. Unmarked school days stay neutral.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {septemberDates(30).map((iso) => {
              const status = byDate.get(iso)
              const weekend = isWeekend(iso)
              const tone =
                status === "Absent"
                  ? "border-destructive/20 bg-destructive/10 text-destructive"
                  : status === "Leave"
                    ? "border-accent/30 bg-accent/15 text-accent-foreground"
                    : status === "Present"
                      ? "bg-success/10 text-success"
                      : weekend
                        ? "text-muted-foreground/50"
                        : "bg-muted/40 text-muted-foreground"
              return (
                <div
                  key={iso}
                  className={`grid aspect-square place-items-center rounded-xl border text-xs font-semibold ${tone}`}
                  title={status ?? (weekend ? "Weekend" : "Not marked")}
                >
                  {Number(iso.slice(-2))}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Results({ childId }: { childId: string }) {
  const { state, child } = useChild(childId)
  const results = publishedResults(state, child)
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Results & DMC"
        detail="Only published mark sheets are listed. A reopened sheet leaves this page."
        action={
          <TextAction onClick={() => downloadChildDmc(state, child.id)}>
            Download DMC
          </TextAction>
        }
      />
      {results.length === 0 ? (
        <EmptyNote
          title="No published results"
          detail="When management publishes a verified sheet for this class, the marks, grade, and rank appear here."
        />
      ) : null}
      {results.map((result) => (
        <Card key={result.exam} className="overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <Badge className="bg-primary-foreground/10 text-primary-foreground">
                  Published
                </Badge>
                <h2 className="mt-4 font-heading text-2xl font-semibold">
                  {result.exam}
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/60">
                  {result.className}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-primary-foreground/55">Overall</p>
                  <p className="font-heading text-3xl font-semibold">
                    {formatPercent(result.overall)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/55">Rank</p>
                  <p className="font-heading text-3xl font-semibold">
                    {String(result.rank).padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Class average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <TableRow key={row.subject}>
                    <TableCell className="font-medium">{row.subject}</TableCell>
                    <TableCell>
                      {row.score} / {row.max}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {letterGrade(row.percent)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatPercent((row.average / row.max) * 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Fees({ childId }: { childId: string }) {
  const { state, child } = useChild(childId)
  const account = balance(state, child.id)
  const receipts = state.receipts
    .filter((receipt) => receipt.studentId === child.id)
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn))
  const statement = () => {
    const lines = [
      `Statement for ${child.name}`,
      `Outstanding,${account.outstanding}`,
      `Paid,${account.paid}`,
      `Advance,${account.advance}`,
      "",
      "Receipt,Period,Type,Amount,Paid on",
      ...receipts.map(
        (receipt) =>
          `${receipt.id},${receipt.period},${receipt.type},${receipt.amount},${receipt.paidOn}`
      ),
    ]
    downloadText(`${child.id}-statement.csv`, lines.join("\n"), "text/csv")
    toast.success("Statement downloaded.")
  }
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Fees & receipts"
        detail={`Read-only ledger for ${child.name}. New desk or sync receipts show up here.`}
        action={<TextAction onClick={statement}>Download statement</TextAction>}
      />
      <Alert
        className={
          account.outstanding > 0
            ? "border-destructive/20 bg-destructive/[0.04]"
            : "border-success/20 bg-success/[0.04]"
        }
      >
        <BadgeCheck
          className={`size-4 ${account.outstanding > 0 ? "text-destructive" : "text-success"}`}
        />
        <AlertTitle>
          {account.outstanding > 0
            ? `${formatPkr(account.outstanding)} outstanding`
            : "All clear"}
        </AlertTitle>
        <AlertDescription>
          {account.outstanding > 0
            ? "A charge on this ledger is not fully covered yet."
            : "Recorded charges are covered. A future payment is stored as an advance."}
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          icon={WalletCards}
          label="Current outstanding"
          value={formatPkr(account.outstanding)}
          note={account.outstanding > 0 ? "Still due" : "No overdue balance"}
          tone="accent"
        />
        <MetricCard
          icon={ReceiptText}
          label="Paid on this ledger"
          value={formatPkr(account.paid)}
          note={`${receipts.length} verified receipts`}
        />
        <MetricCard
          icon={BriefcaseBusiness}
          label="Advance balance"
          value={formatPkr(account.advance)}
          note="Amount paid beyond current charges"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Receipt history</CardTitle>
          <CardDescription>Verified school receipts only</CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <EmptyNote
              title="No receipts yet"
              detail="Payments recorded by the school appear in this list."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono text-xs">
                      {receipt.id}
                    </TableCell>
                    <TableCell>
                      {receipt.type} · {receipt.period}
                    </TableCell>
                    <TableCell>{formatLongDate(receipt.paidOn)}</TableCell>
                    <TableCell>{formatPkr(receipt.amount)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Download ${receipt.id}`}
                        onClick={() => {
                          downloadText(
                            `${receipt.id}.txt`,
                            `Creative Leaders School\nReceipt ${receipt.id}\n${child.name} · ${child.id}\n${receipt.type} · ${receipt.period}\n${formatPkr(receipt.amount)}\nPaid ${formatLongDate(receipt.paidOn)} · ${receipt.method}`
                          )
                          toast.success(`${receipt.id} downloaded.`)
                        }}
                      >
                        <Download />
                      </Button>
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

function Timetable({ childId }: { childId: string }) {
  const { child } = useChild(childId)
  const rows = studentTimetable(child.className)
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Weekly timetable"
        detail={`${child.name} · ${child.className} · Session 2026–27`}
      />
      <Card>
        <CardContent className="overflow-x-auto p-5">
          <div className="grid min-w-[760px] grid-cols-[80px_repeat(5,1fr)] gap-2 text-xs">
            <div />
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
              (day) => (
                <div key={day} className="pb-3 text-center font-semibold">
                  {day}
                </div>
              )
            )}
            {rows.map((row) => (
              <div key={row[0]} className="contents">
                <div className="pt-4 text-muted-foreground">{row[0]}</div>
                {row.slice(1).map((subject, index) => (
                  <div
                    key={`${row[0]}-${index}`}
                    className="min-h-20 rounded-xl border bg-muted/30 p-3"
                  >
                    <p className="font-semibold">{subject}</p>
                    <p className="mt-2 text-muted-foreground">
                      {child.className}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Updates({ childId, query }: { childId: string; query: string }) {
  const { state, child } = useChild(childId)
  const updates = visibleUpdates(state, child.className).filter((update) =>
    matchesQuery(query, [
      update.text,
      update.subject,
      update.type,
      update.className,
    ])
  )
  return (
    <div className="grid gap-6">
      <SectionHeading
        title="School updates"
        detail={`Published homework, classwork, and notices for ${child.name}.`}
      />
      {updates.length === 0 ? (
        <EmptyNote
          title="Nothing published for this child"
          detail="Drafts and items waiting for approval stay hidden."
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {updates.map((update) => (
          <Card key={update.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{update.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatLongDate(update.due)}
                </span>
              </div>
              <CardTitle className="mt-4 text-base">{update.subject}</CardTitle>
              <CardDescription className="text-sm leading-6 text-foreground/75">
                {update.text}
              </CardDescription>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              <BadgeCheck className="mr-2 size-4 text-success" />
              Published for {update.className}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
