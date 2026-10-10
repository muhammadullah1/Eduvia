import { ClipboardList } from "lucide-react"

import { EmptyState, SectionHeading, StatusBadge } from "@/components/app/kit"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { monthlySummaries } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { formatDate } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"

export function ParentTests() {
  const { state, child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const rows = monthlySummaries(
    state.weeklyTests,
    currentMonth,
    state.settings.dailyTestRules,
    { classId: child.classId, studentIds: [child.id], publishedOnly: true }
  )
  return (
    <div className="grid gap-5">
      <SectionHeading
        title={`Weekly tests · ${monthLabel(currentMonth)}`}
        detail="Marks appear once the school publishes them."
        action={
          <ChildSwitcher
            childId={childId}
            onChange={setChildId}
            options={options}
          />
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No weekly tests"
          detail="Weekly subject tests for this class will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.subject}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{row.subject}</CardTitle>
                  <StatusBadge value={row.status} />
                </div>
                <CardDescription>
                  {row.passedCount} passed · {row.failedCount} failed
                  {row.averagePercent === null
                    ? ""
                    : ` · average ${row.averagePercent}%`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {row.tests.map((test) => {
                  const score =
                    test.results.find((result) => result.studentId === child.id)
                      ?.score ?? null
                  return (
                    <div
                      key={test.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>
                        Week {test.week} · {formatDate(test.date)}
                      </span>
                      {test.status === "Published" ? (
                        <span className="font-medium">
                          {score ?? "Absent"}
                          {score === null ? "" : ` / ${test.max}`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {test.status === "Scheduled"
                            ? "Upcoming"
                            : "Awaiting publication"}
                        </span>
                      )}
                    </div>
                  )
                })}
                {row.flaggedForFollowUp ? (
                  <p className="text-xs text-destructive">
                    <ClipboardList className="mr-1 inline size-3.5" />
                    Flagged for follow-up by the school this month.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
