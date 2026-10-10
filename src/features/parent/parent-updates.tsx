import { BadgeCheck } from "lucide-react"

import { EmptyState, StatusBadge } from "@/components/app/kit"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"

export function ParentUpdates() {
  const { state, child, childId, setChildId, options } = useChild()
  // Only management-approved lesson updates and published notices reach parents (UR-04).
  const lessons = state.dailyLessons
    .filter(
      (row) => row.classId === child.classId && row.reviewStatus === "Approved"
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const notices = state.updates.filter(
    (item) => item.classId === child.classId && item.status === "Published"
  )
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <ChildSwitcher
          childId={childId}
          onChange={setChildId}
          options={options}
        />
      </div>
      {lessons.length === 0 && notices.length === 0 ? (
        <EmptyState
          title="No updates yet"
          detail="Lesson updates appear after the school approves them."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <StatusBadge value={item.subject} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.date)}
                  </span>
                </div>
                <CardTitle className="mt-3 text-base">
                  {
                    state.plannedChapters.find(
                      (chapter) => chapter.id === item.chapterId
                    )?.title
                  }
                </CardTitle>
                <CardDescription className="grid gap-1 text-sm leading-6 text-foreground/80">
                  {item.classwork ? (
                    <span>Classwork: {item.classwork}</span>
                  ) : null}
                  {item.homework ? (
                    <span>Homework: {item.homework}</span>
                  ) : null}
                  {item.remarks ? <span>Remarks: {item.remarks}</span> : null}
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">
                <BadgeCheck className="mr-2 size-4 text-success" />
                {item.teacherName} · approved by the school
              </CardFooter>
            </Card>
          ))}
          {notices.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <StatusBadge value={item.kind} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.due)}
                  </span>
                </div>
                <CardTitle className="mt-3 text-base">{item.subject}</CardTitle>
                <CardDescription className="text-sm leading-6 text-foreground/80">
                  {item.text}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
