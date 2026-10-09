import { CalendarClock, Flag, UserCheck, Users } from "lucide-react"

import { MetricCard, StatusBadge } from "@/components/app/kit"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { studentName, useSchool } from "@/data/store"
import { isAttendancePresent } from "@/data/types"
import { monthlySummaries } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { classLabel } from "@/lib/format"

// ---- operations overview ---------------------------------------------------------

/** Operations manager landing page. Deliberately shows no fee amounts (UR-01). */
export function OperationsOverview({
  onOpen,
}: {
  onOpen: (section: string) => void
}) {
  const { state } = useSchool()
  const today = getToday()
  const currentMonth = today.slice(0, 7)
  const active = state.students.filter(
    (student) => student.status === "Active"
  ).length
  const marked = state.attendance.filter((mark) => mark.date === today)
  const present = marked.filter((mark) =>
    isAttendancePresent(mark.status)
  ).length
  const pendingCover = state.teacherAbsences.filter(
    (row) => row.date === today && row.status === "Pending"
  ).length
  const toReview = state.dailyLessons.filter(
    (row) => row.reviewStatus === "Submitted"
  ).length
  const toPublish = state.weeklyTests.filter(
    (test) => test.status === "MarksEntered"
  ).length
  const flagged = monthlySummaries(
    state.weeklyTests,
    currentMonth,
    state.settings.dailyTestRules
  ).filter((row) => row.flaggedForFollowUp)
  const queue = [
    {
      count: pendingCover,
      title: "Absent periods without cover today",
      section: "absences",
    },
    {
      count: toReview,
      title: "Daily updates awaiting review",
      section: "lesson-review",
    },
    {
      count: toPublish,
      title: "Weekly tests ready to publish",
      section: "weekly-tests",
    },
    {
      count: state.sheets.filter((sheet) => sheet.status === "Submitted")
        .length,
      title: "Mark sheets awaiting verification",
      section: "exams",
    },
    {
      count: state.applications.filter(
        (item) => item.status === "New" || item.status === "Review"
      ).length,
      title: "Applications to review",
      section: "admissions",
    },
  ]

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Active students"
          value={String(active)}
          note={`${state.classes.length} class sections`}
          tone="accent"
        />
        <MetricCard
          icon={UserCheck}
          label="Today’s attendance"
          value={
            marked.length
              ? `${Math.round((present / marked.length) * 100)}%`
              : "—"
          }
          note={`${present} present`}
        />
        <MetricCard
          icon={CalendarClock}
          label="Periods needing cover"
          value={String(pendingCover)}
          note="Today"
        />
        <MetricCard
          icon={Flag}
          label="Flagged this month"
          value={String(flagged.length)}
          note="Failed a subject (weekly tests)"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attention queue</CardTitle>
            <CardDescription>
              Academic operations that need a decision
            </CardDescription>
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
                <span className="text-sm font-medium">{item.title}</span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Follow-up list · {monthLabel(currentMonth)}</CardTitle>
            <CardDescription>
              More than {state.settings.dailyTestRules.maxFailsPerMonth} failed
              weekly test(s) in a subject
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students flagged.
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
                    · {row.subject} · {classLabel(state.classes, row.classId)}
                  </span>
                  <StatusBadge value="Failed" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
