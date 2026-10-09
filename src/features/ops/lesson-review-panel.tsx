import { useState } from "react"
import { toast } from "sonner"

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
import { useSchool } from "@/data/store"
import { type ReviewStatus } from "@/data/types"
import { useActor } from "@/lib/actor"
import { classLabel, formatDate } from "@/lib/format"

// ---- lesson review (UR-04) ------------------------------------------------------------

export function LessonReviewPanel() {
  const { state, reviewDailyLesson } = useSchool()
  const actor = useActor()
  const [filter, setFilter] = useState<ReviewStatus | "all">("Submitted")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const rows = state.dailyLessons
    .filter((row) => filter === "all" || row.reviewStatus === filter)
    .sort((a, b) => b.date.localeCompare(a.date))

  function decide(id: string, decision: "Approved" | "Rejected") {
    const message = reviewDailyLesson(id, decision, notes[id] ?? "", actor)
    if (message) toast.error(message)
    else
      toast.success(
        decision === "Approved"
          ? "Approved — now visible to parents"
          : "Returned to the teacher"
      )
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
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here"
          detail="No daily updates match this filter."
        />
      ) : (
        rows.map((row) => {
          const chapter = state.plannedChapters.find(
            (item) => item.id === row.chapterId
          )
          return (
            <Card key={row.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge value={row.reviewStatus} />
                    <span className="text-sm font-medium">
                      {row.teacherName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {classLabel(state.classes, row.classId)} · {row.subject} ·{" "}
                    {formatDate(row.date)}
                  </span>
                </div>
                <CardTitle className="text-base">
                  {chapter?.title ?? "Unknown chapter"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {row.classwork ? (
                  <p>
                    <span className="text-muted-foreground">Classwork:</span>{" "}
                    {row.classwork}
                  </p>
                ) : null}
                {row.homework ? (
                  <p>
                    <span className="text-muted-foreground">Homework:</span>{" "}
                    {row.homework}
                  </p>
                ) : null}
                {row.remarks ? (
                  <p>
                    <span className="text-muted-foreground">Remarks:</span>{" "}
                    {row.remarks}
                  </p>
                ) : null}
                {row.reviewedBy ? (
                  <p className="text-xs text-muted-foreground">
                    Reviewed by {row.reviewedBy}
                    {row.reviewNote ? ` — ${row.reviewNote}` : ""}
                  </p>
                ) : null}
                {row.reviewStatus === "Submitted" ? (
                  <Textarea
                    value={notes[row.id] ?? ""}
                    onChange={(event) =>
                      setNotes({ ...notes, [row.id]: event.target.value })
                    }
                    placeholder="Note to the teacher (required to reject)"
                  />
                ) : null}
              </CardContent>
              {row.reviewStatus === "Submitted" ? (
                <CardFooter className="gap-2">
                  <Button size="sm" onClick={() => decide(row.id, "Approved")}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => decide(row.id, "Rejected")}
                  >
                    Reject
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          )
        })
      )}
    </div>
  )
}
