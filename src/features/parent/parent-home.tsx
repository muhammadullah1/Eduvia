import { BookOpen, GraduationCap, UserCheck, WalletCards } from "lucide-react"

import { EmptyState, MetricCard, StatusBadge } from "@/components/app/kit"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { isAttendancePresent, type SchoolState } from "@/data/types"
import { weekdayOf } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { monthLabel } from "@/lib/fees"
import { classLabel, formatDate } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"
import { unpaidMonths, visibilityFor } from "./visibility"

export function ParentHome() {
  const { state, child, childId, setChildId, options } = useChild()
  const today = getToday()
  const currentMonth = today.slice(0, 7)
  const marks = state.attendance.filter(
    (mark) => mark.studentId === child.id && mark.date.startsWith(currentMonth)
  )
  const present = marks.filter((mark) =>
    isAttendancePresent(mark.status)
  ).length
  const rate = marks.length
    ? `${Math.round((present / marks.length) * 1000) / 10}%`
    : "—"
  const visible = state.sheets.filter(
    (sheet) =>
      sheet.classId === child.classId &&
      visibilityFor(state, sheet, child.id).visible
  )
  const withheld = state.sheets.some(
    (sheet) =>
      sheet.classId === child.classId &&
      sheet.status === "Published" &&
      !visibilityFor(state, sheet, child.id).visible
  )
  const scores = visible.flatMap((sheet) =>
    sheet.rows
      .filter((row) => row.studentId === child.id && row.score !== null)
      .map((row) => ((row.score as number) / sheet.max) * 100)
  )
  const average = scores.length
    ? `${Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10}%`
    : withheld
      ? "Withheld"
      : "—"
  const unpaid = unpaidMonths(state, child.id)
  const lessons = state.dailyLessons
    .filter(
      (row) => row.classId === child.classId && row.reviewStatus === "Approved"
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const homework = lessons.filter((row) => row.homework)
  const day = weekdayOf(today)
  const periods = state.slots
    .filter((slot) => slot.classId === child.classId && slot.day === day)
    .sort((a, b) => a.periodIndex - b.periodIndex)
  const updates = lessons.slice(0, 3)

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl font-semibold">
              {child.name}
            </h2>
            <StatusBadge value={child.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {classLabel(state.classes, child.classId)} · {child.id}
          </p>
        </div>
        <ChildSwitcher
          childId={childId}
          onChange={setChildId}
          options={options}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UserCheck}
          label={`${monthLabel(currentMonth)} attendance`}
          value={rate}
          note={`${present} of ${marks.length} days`}
          tone="accent"
        />
        <MetricCard
          icon={GraduationCap}
          label="Published results"
          value={average}
          note={
            withheld
              ? "Held until fees are cleared"
              : "Average of visible results"
          }
        />
        <MetricCard
          icon={WalletCards}
          label="Fee status"
          value={unpaid.length ? `${unpaid.length} unpaid` : "Paid"}
          note={
            unpaid.length
              ? unpaid.map((month) => monthLabel(month.month)).join(", ")
              : "No month outstanding"
          }
        />
        <MetricCard
          icon={BookOpen}
          label="Homework"
          value={String(homework.length).padStart(2, "0")}
          note="From approved daily updates"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today at school</CardTitle>
            <CardDescription>{formatDate(today)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {periods.map((slot) => {
              const attendance = state.attendance.find(
                (mark) => mark.studentId === child.id && mark.date === today
              )
              return (
                <div
                  key={slot.id}
                  className="flex items-center gap-4 rounded-xl border p-3"
                >
                  <p className="w-12 text-xs font-semibold">{slot.time}</p>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{slot.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {substituteFor(state, slot.classId, slot.periodIndex) ??
                        slot.teacher}{" "}
                      · {slot.room}
                    </p>
                  </div>
                  <StatusBadge
                    value={
                      slot.time < "11:00"
                        ? (attendance?.status ?? "Present")
                        : "Upcoming"
                    }
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest updates</CardTitle>
            <CardDescription>Approved by the school</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {updates.length === 0 ? (
              <EmptyState
                title="No updates"
                detail="Approved lesson updates for this class will appear here."
              />
            ) : (
              updates.map((item) => (
                <div
                  key={item.id}
                  className="border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge value={item.subject} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">
                    {
                      state.plannedChapters.find(
                        (chapter) => chapter.id === item.chapterId
                      )?.title
                    }
                  </p>
                  {item.homework ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Homework: {item.homework}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** The teacher actually covering a period today (substitute when one is assigned). */
function substituteFor(
  state: SchoolState,
  classId: string,
  periodIndex: number
) {
  const row = state.substitutions.find(
    (item) =>
      item.classId === classId &&
      item.date === getToday() &&
      item.periodIndex === periodIndex
  )
  return row
    ? `${state.staff.find((person) => person.id === row.substituteTeacherId)?.name} (substitute)`
    : null
}
