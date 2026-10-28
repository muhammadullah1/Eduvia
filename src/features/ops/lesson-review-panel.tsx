import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import dailyLessonsService, {
  type DailyLessonDto,
} from "@/api/lessons/daily-lessons.service"
import { EmptyState, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type ReviewStatus } from "@/data/types"
import { formatDate } from "@/lib/format"

const LESSONS_KEY = ["daily-lessons"] as const

function teacherName(row: DailyLessonDto) {
  const user = row.teacher?.user
  if (!user) return "Teacher"
  return `${user.firstName} ${user.lastName}`.trim()
}

export function LessonReviewPanel() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<ReviewStatus | "all">("Submitted")
  const [notes, setNotes] = useState<Record<string, string>>({})

  const lessonsQuery = useQuery({
    queryKey: [...LESSONS_KEY, filter],
    queryFn: () =>
      dailyLessonsService.list(
        filter === "all" ? undefined : { reviewStatus: filter }
      ),
  })

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: number
      decision: "Approved" | "Rejected"
      note: string
    }) => dailyLessonsService.review(id, { decision, note }),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.decision === "Approved"
          ? "Approved — now visible to parents"
          : "Returned to the teacher"
      )
      void queryClient.invalidateQueries({ queryKey: LESSONS_KEY })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not review update")
    },
  })

  const rows = [...(lessonsQuery.data ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  )

  function decide(id: number, decision: "Approved" | "Rejected") {
    const note = notes[String(id)] ?? ""
    if (decision === "Rejected" && !note.trim()) {
      toast.error("Tell the teacher why the update is rejected.")
      return
    }
    reviewMutation.mutate({ id, decision, note })
  }

  return (
    <div className="grid gap-4">
      <SectionHeading
        title="Daily updates"
        detail="Only approved updates reach parents."
        action={
          <div className="w-44">
            <Select
              value={filter}
              onValueChange={(value) =>
                setFilter(value as ReviewStatus | "all")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All</SelectItem>
                  {["Submitted", "Approved", "Rejected"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />
      {lessonsQuery.isLoading ? (
        <EmptyState title="Loading…" detail="Fetching daily updates." />
      ) : lessonsQuery.isError ? (
        <EmptyState
          title="Could not load updates"
          detail="Check your connection and try again."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing here"
          detail="No daily updates match this filter."
        />
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={row.reviewStatus} />
                  <span className="text-sm font-medium">{teacherName(row)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {row.class?.label ?? `Class #${row.fkClassId}`} ·{" "}
                  {row.subject?.name ?? "Subject"} · {formatDate(row.date)}
                </span>
              </div>
              <CardTitle className="text-base">
                {row.chapter?.title || row.title || "Daily update"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground">
              {row.classwork ? <p>Classwork: {row.classwork}</p> : null}
              {row.homework ? <p>Homework: {row.homework}</p> : null}
              {row.remarks ? <p>Remarks: {row.remarks}</p> : null}
              {row.reviewNote ? (
                <p className="text-[var(--cls-ink)]">Review note: {row.reviewNote}</p>
              ) : null}
            </CardContent>
            {row.reviewStatus === "Submitted" ? (
              <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                <Textarea
                  value={notes[String(row.id)] ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [String(row.id)]: e.target.value,
                    }))
                  }
                  placeholder="Optional note (required to reject)"
                  className="min-h-20"
                />
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    disabled={reviewMutation.isPending}
                    onClick={() => decide(row.id, "Approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={reviewMutation.isPending}
                    onClick={() => decide(row.id, "Rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </CardFooter>
            ) : null}
          </Card>
        ))
      )}
    </div>
  )
}
