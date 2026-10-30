import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, CalendarPlus, Flag, ListChecks, Send, Table2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import examsService, { type DailyTestDto,dailyTestOutOf } from "@/api/exams/exams.service"
import { ClsEmpty, clsHeadRowClass, ClsPanel, ClsPanelHeader, clsRowClass,ClsTh } from "@/components/app/cls-panel"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useCan } from "@/lib/access"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { getToday } from "@/lib/dates"
import { toast } from "@/lib/toast"

import { DailyMarksDialog } from "./daily-marks-dialog"
import { ExamStatusPill } from "./exam-status-pill"

type Tab = "tests" | "summary" | "flagged"

const TABS = [
  { value: "tests", label: "Tests", icon: ListChecks },
  { value: "summary", label: "Monthly summary", icon: Table2 },
  { value: "flagged", label: "Flagged", icon: Flag },
]

function monthOptions() {
  const now = new Date()
  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    return { value, label: date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }
  })
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.")

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

export function DailyTestsPanel() {
  const actor = useActor()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>("tests")
  const [month, setMonth] = useState(currentMonth)
  const [marking, setMarking] = useState<DailyTestDto | null>(null)
  const can = useCan()
  const canSchedule = can("tests.schedule")
  const canMark = can("tests.marks")
  const canPublish = can("tests.publish")
  const months = useMemo(() => monthOptions(), [])

  const tests = useQuery({
    queryKey: ["daily-tests", month],
    queryFn: () => examsService.dailyTests(month),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["daily-tests"] })

  const generate = useMutation({
    mutationFn: () => examsService.generateDailyTests(month),
    onSuccess: (created) => {
      toast.success(created.length ? `${created.length} tests added for ${month}.` : "Every scheduled test already exists.")
      void refresh()
    },
    onError: (error) => toast.error(errorText(error)),
  })
  const publish = useMutation({
    mutationFn: (id: number) => examsService.publishDailyTest(id),
    onSuccess: () => {
      toast.success("Published. Parents can now see these marks.")
      void refresh()
    },
    onError: (error) => toast.error(errorText(error)),
  })

  const rows = tests.data ?? []
  const today = getToday()
  const monthPicker = (
    <Select value={month} onValueChange={setMonth}>
      <SelectTrigger className="h-9 w-[170px] bg-white" aria-label="Month">
        <CalendarDays className="size-4 text-[var(--cls-muted)]" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-col gap-4">
      <ClsSubTabs
        aria-label="Daily tests"
        items={TABS.filter((item) => item.value !== "flagged" || canSchedule).map((item) =>
          item.value === "tests" ? { ...item, count: rows.length } : item
        )}
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        trailing={monthPicker}
      />
      {tab === "tests" ? (
        <ClsPanel>
          <ClsPanelHeader
            title="Weekly subject tests"
            description={
              canPublish
                ? "Generated from the daily test schedule. Enter marks, then publish so parents can see them."
                : "Enter marks on or after the test day. Management publishes them to parents."
            }
            actions={
              canSchedule ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(portalPath(actor.role, "daily-test-schedule"))}>
                    Test days
                  </Button>
                  <Button size="sm" disabled={generate.isPending} onClick={() => generate.mutate()}>
                    <CalendarPlus data-icon="inline-start" />
                    {generate.isPending ? "Generating…" : "Generate month"}
                  </Button>
                </>
              ) : null
            }
          />
          {tests.isLoading ? (
            <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">Loading daily tests…</p>
          ) : tests.isError ? (
            <p className="px-4 py-6 text-sm text-red-700">{errorText(tests.error)}</p>
          ) : rows.length === 0 ? (
            <ClsEmpty title="No tests this month">
              {canSchedule
                ? "Set test days on the schedule, then choose Generate month."
                : "Tests appear here once management generates the month."}
            </ClsEmpty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className={clsHeadRowClass}>
                  <ClsTh className="pl-4">Date</ClsTh>
                  <ClsTh>Class</ClsTh>
                  <ClsTh>Subject</ClsTh>
                  <ClsTh>Week</ClsTh>
                  <ClsTh>Out of</ClsTh>
                  <ClsTh>Marked</ClsTh>
                  <ClsTh>Status</ClsTh>
                  <ClsTh className="pr-4 text-right">Actions</ClsTh>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((test) => {
                  const results = test.results ?? []
                  const entered = results.filter((row) => row.isAbsent || row.obtainedMarks != null).length
                  const published = test.status === "Published"
                  const upcoming = test.date > today
                  return (
                    <TableRow key={test.id} className={clsRowClass}>
                      <TableCell className="pl-4 font-medium text-[var(--cls-ink)]">{formatDate(test.date)}</TableCell>
                      <TableCell>{test.class?.label ?? "—"}</TableCell>
                      <TableCell>{test.subject?.name ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{test.weekOfMonth ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{dailyTestOutOf(test)}</TableCell>
                      <TableCell className="tabular-nums">{entered}</TableCell>
                      <TableCell>
                        <ExamStatusPill status={test.status} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="flex justify-end gap-2">
                          {canMark ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={upcoming}
                              title={upcoming ? "Marks open on the test day." : undefined}
                              onClick={() => setMarking(test)}
                            >
                              {published ? "View marks" : "Marks"}
                            </Button>
                          ) : null}
                          {canPublish && test.status === "MarksEntered" ? (
                            <Button size="sm" disabled={publish.isPending} onClick={() => publish.mutate(test.id)}>
                              <Send data-icon="inline-start" />
                              Publish
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </ClsPanel>
      ) : tab === "summary" ? (
        <MonthlySummary month={month} tests={rows} />
      ) : (
        <FlaggedList month={month} />
      )}
      {marking ? (
        <DailyMarksDialog
          test={marking}
          onClose={() => setMarking(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </div>
  )
}

function MonthlySummary({ month, tests }: { month: string; tests: DailyTestDto[] }) {
  const combos = useMemo(() => {
    const seen = new Map<string, { classId: number; subjectId: number; label: string }>()
    for (const test of tests) {
      const key = `${test.fkClassId}:${test.fkSubjectId}`
      if (!seen.has(key)) {
        seen.set(key, {
          classId: test.fkClassId,
          subjectId: test.fkSubjectId,
          label: `${test.class?.label ?? "Class"} · ${test.subject?.name ?? "Subject"}`,
        })
      }
    }
    return [...seen.entries()]
  }, [tests])
  const [picked, setPicked] = useState("")
  const key = combos.some(([value]) => value === picked) ? picked : (combos[0]?.[0] ?? "")
  const combo = combos.find(([value]) => value === key)?.[1]

  const summary = useQuery({
    queryKey: ["daily-tests", "summary", month, key],
    queryFn: () =>
      combo
        ? examsService.dailyMonthlySummary(combo.classId, combo.subjectId, month)
        : Promise.reject(new Error("Pick a class and subject.")),
    enabled: Boolean(combo),
  })

  if (!combo) {
    return (
      <ClsPanel>
        <ClsEmpty title="Nothing to summarise yet">Generate this month’s tests first.</ClsEmpty>
      </ClsPanel>
    )
  }
  const data = summary.data
  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Monthly summary"
        description={
          data
            ? `Pass mark ${data.rules.passPercent}%. Students failing more than ${data.rules.maxFailsPerMonth} test${data.rules.maxFailsPerMonth === 1 ? "" : "s"} are flagged.`
            : "Each student’s weekly marks and month outcome."
        }
        actions={
          <Select value={key} onValueChange={setPicked}>
            <SelectTrigger className="h-9 w-[220px] bg-white" aria-label="Class and subject">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {combos.map(([value, item]) => (
                <SelectItem key={value} value={value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {summary.isLoading || !data ? (
        <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">
          {summary.isError ? errorText(summary.error) : "Loading summary…"}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className={clsHeadRowClass}>
              <ClsTh className="pl-4">Student</ClsTh>
              {data.tests.map((test) => (
                <ClsTh key={test.id} className="text-center">
                  W{test.weekOfMonth}
                </ClsTh>
              ))}
              <ClsTh className="text-center">Failed</ClsTh>
              <ClsTh className="pr-4">Outcome</ClsTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.map((row) => (
              <TableRow key={row.student.id} className={clsRowClass}>
                <TableCell className="pl-4">
                  <p className="font-medium text-[var(--cls-ink)]">
                    {row.student.firstName} {row.student.lastName}
                  </p>
                  <p className="text-xs text-[var(--cls-muted)]">{row.student.admissionNo}</p>
                </TableCell>
                {data.tests.map((test, index) => {
                  const score = row.scores[index]
                  const failed = score != null && (score / test.maxScore) * 100 < data.rules.passPercent
                  return (
                    <TableCell key={test.id} className="text-center tabular-nums">
                      {row.absent[index] ? (
                        <span className="text-xs font-medium text-red-700">Absent</span>
                      ) : score == null ? (
                        <span className="text-[var(--cls-muted)]">—</span>
                      ) : (
                        <span className={failed ? "font-medium text-red-700" : undefined}>{score}</span>
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center tabular-nums">{row.summary?.failedCount ?? 0}</TableCell>
                <TableCell className="pr-4">
                  <OutcomeTag outcome={row.summary} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ClsPanel>
  )
}

const OUTCOME_LABEL: Record<string, string> = { InProgress: "In progress", Passed: "Passed", Failed: "Failed" }

function OutcomeTag({ outcome }: { outcome: { status: string; flaggedForFollowUp: boolean; testsTaken: number } | null }) {
  if (!outcome || outcome.testsTaken === 0) return <span className="text-xs text-[var(--cls-muted)]">No marks yet</span>
  const tone = outcome.flaggedForFollowUp
    ? "border-red-200 bg-red-50 text-red-700"
    : outcome.status === "Passed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-ink)]"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {outcome.flaggedForFollowUp ? <Flag className="size-3" /> : null}
      {outcome.flaggedForFollowUp ? "Flagged" : (OUTCOME_LABEL[outcome.status] ?? outcome.status)}
    </span>
  )
}

function FlaggedList({ month }: { month: string }) {
  const can = useCan()
  const flagged = useQuery({
    queryKey: ["daily-tests", "flagged", month],
    queryFn: () => examsService.dailyFlagged(month),
    enabled: can("tests.schedule"),
  })
  const rows = flagged.data ?? []
  return (
    <ClsPanel>
      <ClsPanelHeader
        title="Flagged for follow-up"
        description="Students who failed more weekly tests this month than the school allows. Absent counts as a fail."
      />
      {flagged.isLoading ? (
        <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">Loading…</p>
      ) : flagged.isError ? (
        <p className="px-4 py-6 text-sm text-red-700">{errorText(flagged.error)}</p>
      ) : rows.length === 0 ? (
        <ClsEmpty title="No one is flagged this month" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className={clsHeadRowClass}>
              <ClsTh className="pl-4">Student</ClsTh>
              <ClsTh>Class</ClsTh>
              <ClsTh>Subject</ClsTh>
              <ClsTh className="text-center">Tests taken</ClsTh>
              <ClsTh className="pr-4 text-center">Failed</ClsTh>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={clsRowClass}>
                <TableCell className="pl-4">
                  <p className="font-medium text-[var(--cls-ink)]">
                    {row.student ? `${row.student.firstName} ${row.student.lastName}` : "—"}
                  </p>
                  <p className="text-xs text-[var(--cls-muted)]">{row.student?.admissionNo}</p>
                </TableCell>
                <TableCell>{row.class?.label ?? "—"}</TableCell>
                <TableCell>{row.subject?.name ?? "—"}</TableCell>
                <TableCell className="text-center tabular-nums">{row.testsTaken}</TableCell>
                <TableCell className="pr-4 text-center font-medium text-red-700 tabular-nums">{row.failedCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ClsPanel>
  )
}
