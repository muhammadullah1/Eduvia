import { useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"

import examsService from "@/api/exams/exams.service"
import { EmptyState, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { formatDate } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"

const OUTCOME_LABEL: Record<string, string> = {
  InProgress: "In progress",
  LowMarks: "Low marks",
}

/** Published weekly tests only; the API applies the school's month rules. */
export function ParentTests() {
  const { child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const summary = useQuery({
    queryKey: ["daily-tests", "child", child.id, currentMonth],
    queryFn: () => examsService.childMonthlySummary(Number(child.id), currentMonth),
  })
  const rows = summary.data ?? []

  return (
    <div className="grid gap-5">
      <SectionHeading
        title={`Weekly tests · ${monthLabel(currentMonth)}`}
        detail="Marks appear once the school publishes them."
        action={<ChildSwitcher childId={childId} onChange={setChildId} options={options} />}
      />
      {summary.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading weekly tests…</p>
      ) : summary.isError ? (
        <p className="text-sm text-destructive">
          {summary.error instanceof Error ? summary.error.message : "Could not load weekly tests."}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState title="No weekly tests yet" detail="Published weekly subject tests for this class appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.subject?.id ?? "subject"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{row.subject?.name ?? "Subject"}</CardTitle>
                  <StatusBadge value={OUTCOME_LABEL[row.outcome.status] ?? row.outcome.status} />
                </div>
                <CardDescription>
                  {row.outcome.passedCount} passed · {row.outcome.failedCount} failed (absent counts as failed)
                  {row.outcome.averagePercent === null ? "" : ` · average ${row.outcome.averagePercent}%`}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {row.tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      Week {test.weekOfMonth} · {formatDate(test.date)}
                    </span>
                    <span className={test.passed === false ? "font-medium text-destructive" : "font-medium"}>
                      {test.absent ? "Absent" : test.score == null ? "Not marked" : `${test.score} / ${test.maxScore}`}
                    </span>
                  </div>
                ))}
                {row.outcome.flaggedForFollowUp ? (
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
