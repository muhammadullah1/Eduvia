import { ClipboardList, Flag } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { EmptyState, Field, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { studentName, useSchool } from "@/data/store"
import { type WeeklyTest } from "@/data/types"
import { monthlySummaries, weekdayOf, WEEKDAYS } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { classLabel, formatDate } from "@/lib/format"

import { ClassSubjectPicker } from "./class-subject-picker"
import { MarksDialog } from "./marks-dialog"

function ScoreCell({
  test,
  studentId,
}: {
  test: WeeklyTest
  studentId: string
}) {
  const { state } = useSchool()
  const score =
    test.results.find((row) => row.studentId === studentId)?.score ?? null
  if (test.status === "Scheduled" || score === null)
    return <span className="text-muted-foreground">—</span>
  const failed =
    (score / test.max) * 100 < state.settings.dailyTestRules.passPercent
  return (
    <span className={failed ? "font-semibold text-destructive" : ""}>
      {score}/{test.max}
      {test.status !== "Published" ? "*" : ""}
    </span>
  )
}

export function WeeklyTestsPanel() {
  const { state, saveTestSchedule, generateMonthTests, publishWeeklyTest } =
    useSchool()
  const actor = useActor()
  const [selectedClassId, setClassId] = useState("")
  const classId =
    selectedClassId && state.classes.some((c) => c.id === selectedClassId)
      ? selectedClassId
      : (state.classes.find(
          (c) => c.label.includes("Grade 7") || c.id === "g7b"
        )?.id ??
        state.classes[0]?.id ??
        "g7b")
  const [form, setForm] = useState({
    classId,
    subject: "Mathematics",
    weekday: "Thursday",
    periodIndex: "4",
    max: "20",
  })
  const [marking, setMarking] = useState<WeeklyTest | null>(null)
  const [month, setMonth] = useState(() => getToday().slice(0, 7))
  const rules = state.settings.dailyTestRules
  const tests = state.weeklyTests
    .filter((test) => test.month === month)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.classId.localeCompare(b.classId)
    )
  const summaries = useMemo(
    () => monthlySummaries(state.weeklyTests, month, rules),
    [state.weeklyTests, month, rules]
  )
  const classRows = summaries
    .filter((row) => row.classId === classId)
    .sort(
      (a, b) =>
        a.subject.localeCompare(b.subject) ||
        studentName(state.students, a.studentId).localeCompare(
          studentName(state.students, b.studentId)
        )
    )
  const flagged = summaries.filter((row) => row.flaggedForFollowUp)

  return (
    <Tabs defaultValue="tests" className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="summary">Monthly summary</TabsTrigger>
          <TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger>
          <TabsTrigger value="schedule">Test days</TabsTrigger>
        </TabsList>
        <Input
          type="month"
          className="w-44"
          value={month}
          onChange={(event) =>
            setMonth(event.target.value || getToday().slice(0, 7))
          }
        />
      </div>
      <Alert>
        <ClipboardList />
        <AlertTitle>Rules for {monthLabel(month)}</AlertTitle>
        <AlertDescription>
          Pass at {rules.passPercent}%. More than {rules.maxFailsPerMonth}{" "}
          failed test(s) in a subject ⇒ Failed and flagged for follow-up.
          {rules.lowMarksEnabled
            ? ` ${rules.lowMarksMinPassed}+ passed but average below ${rules.lowMarksBelowPercent}% ⇒ Low marks.`
            : ""}{" "}
          * = not yet published.
        </AlertDescription>
      </Alert>

      <TabsContent value="tests">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Weekly tests · {monthLabel(month)}</CardTitle>
              <CardDescription>
                Parents see marks only after publishing.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const message = generateMonthTests(month, actor)
                if (message) toast.error(message)
                else toast.success("Tests generated from the test days")
              }}
            >
              Generate month
            </Button>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <EmptyState
                title="No tests"
                detail="Set test days, then generate the month."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        {weekdayOf(test.date).slice(0, 3)}{" "}
                        {formatDate(test.date)}
                      </TableCell>
                      <TableCell>
                        {classLabel(state.classes, test.classId)}
                      </TableCell>
                      <TableCell>{test.subject}</TableCell>
                      <TableCell>W{test.week}</TableCell>
                      <TableCell>
                        {
                          test.results.filter((row) => row.score !== null)
                            .length
                        }
                        /{test.results.length}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={test.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {test.status !== "Published" &&
                          test.date <= getToday() ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMarking(test)}
                            >
                              Marks
                            </Button>
                          ) : null}
                          {test.status === "MarksEntered" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const message = publishWeeklyTest(
                                  test.id,
                                  actor
                                )
                                if (message) toast.error(message)
                                else toast.success("Published to parents")
                              }}
                            >
                              Publish
                            </Button>
                          ) : null}
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
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Monthly subject summary</CardTitle>
              <CardDescription>
                Each weekly test of the month, then the outcome.
              </CardDescription>
            </div>
            <div className="w-52">
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {state.classes.map((klass) => (
                      <SelectItem key={klass.id} value={klass.id}>
                        {klass.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {classRows.length === 0 ? (
              <EmptyState
                title="No weekly tests"
                detail="This class has no weekly tests in the selected month."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Weekly tests</TableHead>
                    <TableHead>Passed / failed</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classRows.map((row) => (
                    <TableRow key={`${row.studentId}-${row.subject}`}>
                      <TableCell className="font-medium">
                        {studentName(state.students, row.studentId)}
                      </TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell>
                        <div className="flex gap-3">
                          {row.tests.map((test) => (
                            <span key={test.id} className="text-xs">
                              W{test.week}:{" "}
                              <ScoreCell
                                test={test}
                                studentId={row.studentId}
                              />
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.passedCount} / {row.failedCount}
                      </TableCell>
                      <TableCell>
                        {row.averagePercent === null
                          ? "—"
                          : `${row.averagePercent}%`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusBadge value={row.status} />
                          {row.flaggedForFollowUp ? (
                            <Flag className="size-4 text-destructive" />
                          ) : null}
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

      <TabsContent value="flagged">
        <Card>
          <CardHeader>
            <CardTitle>Flagged for follow-up</CardTitle>
            <CardDescription>
              Failed for the subject this month.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody is flagged for {monthLabel(month)}.
              </p>
            ) : (
              flagged.map((row) => (
                <div
                  key={`${row.studentId}-${row.subject}`}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {studentName(state.students, row.studentId)}
                    </span>{" "}
                    · {classLabel(state.classes, row.classId)} · {row.subject}
                  </span>
                  <span className="text-muted-foreground">
                    {row.failedCount} failed of {row.testsTaken}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent
        value="schedule"
        className="grid gap-5 xl:grid-cols-[1fr_320px]"
      >
        <Card>
          <CardHeader>
            <CardTitle>Test days</CardTitle>
            <CardDescription>
              One weekly test per class and subject — about four a month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Out of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.testSchedules.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {classLabel(state.classes, row.classId)}
                    </TableCell>
                    <TableCell>{row.subject}</TableCell>
                    <TableCell>{row.weekday}</TableCell>
                    <TableCell>P{row.periodIndex}</TableCell>
                    <TableCell>{row.max}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Set test day</CardTitle>
            <CardDescription>
              Replaces the existing day for that class and subject.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ClassSubjectPicker
              classId={form.classId}
              subject={form.subject}
              onClass={(value) => setForm({ ...form, classId: value })}
              onSubject={(value) => setForm({ ...form, subject: value })}
            />
            <Field label="Weekday">
              <Select
                value={form.weekday}
                onValueChange={(weekday) => setForm({ ...form, weekday })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Period">
                <Input
                  value={form.periodIndex}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      periodIndex: event.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />
              </Field>
              <Field label="Out of">
                <Input
                  value={form.max}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      max: event.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />
              </Field>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                const message = saveTestSchedule(
                  {
                    classId: form.classId,
                    subject: form.subject,
                    weekday: form.weekday,
                    periodIndex: Number(form.periodIndex) || 1,
                    max: Number(form.max) || 0,
                  },
                  actor
                )
                if (message) toast.error(message)
                else toast.success("Test day saved")
              }}
            >
              Save
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <MarksDialog test={marking} onClose={() => setMarking(null)} />
    </Tabs>
  )
}
