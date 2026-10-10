import { useState } from "react"

import { EmptyState, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSchool } from "@/data/store"
import { type WeeklyTest } from "@/data/types"
import { MarksDialog } from "@/features/ops/screens"
import { weekdayOf } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { classLabel, formatDate } from "@/lib/format"

import { signedInTeacher } from "./session"

export function TeacherWeeklyTests() {
  const { state } = useSchool()
  const teacher = signedInTeacher(state.staff)
  const [marking, setMarking] = useState<WeeklyTest | null>(null)
  const today = getToday()
  const month = today.slice(0, 7)
  const tests = state.weeklyTests
    .filter(
      (test) =>
        test.month === month &&
        test.subject === teacher?.subject &&
        teacher.classIds.includes(test.classId)
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.classId.localeCompare(b.classId)
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly tests · {monthLabel(month)}</CardTitle>
        <CardDescription>
          Enter marks on or after the test day. Management publishes them to
          parents.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {tests.length === 0 ? (
          <EmptyState
            title="No tests scheduled"
            detail="The operations manager sets one test day per subject."
          />
        ) : (
          tests.map((test) => {
            const entered = test.results.filter(
              (row) => row.score !== null
            ).length
            const due = test.date <= today
            return (
              <div
                key={test.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {classLabel(state.classes, test.classId)} · week {test.week}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {weekdayOf(test.date)} {formatDate(test.date)} · out of{" "}
                    {test.max} · {entered}/{test.results.length} marks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    value={
                      test.status === "Scheduled" && !due
                        ? "Upcoming"
                        : test.status
                    }
                  />
                  {test.status !== "Published" && due ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMarking(test)}
                    >
                      {entered ? "Edit marks" : "Enter marks"}
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
      <MarksDialog test={marking} onClose={() => setMarking(null)} />
    </Card>
  )
}
