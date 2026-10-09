import { UserCheck } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { EmptyState, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { useSchool } from "@/data/store"
import { isAttendancePresent } from "@/data/types"
import { teacherDuties, weekdayOf } from "@/lib/academics"
import { getToday } from "@/lib/dates"
import { classLabel, formatDate } from "@/lib/format"

import { signedInTeacher } from "./session"

const attendanceConfig = {
  value: { label: "Attendance", color: "var(--chart-1)" },
} satisfies ChartConfig

function schoolWeek(today: string) {
  const date = new Date(`${today}T00:00:00`)
  const weekday = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1))
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    const month = String(day.getMonth() + 1).padStart(2, "0")
    const dateNumber = String(day.getDate()).padStart(2, "0")
    return [
      `${day.getFullYear()}-${month}-${dateNumber}`,
      ["Mon", "Tue", "Wed", "Thu", "Fri"][index],
    ] as const
  })
}

export function TeacherToday({
  onOpen,
}: {
  onOpen: (section: string) => void
}) {
  const { state } = useSchool()
  const today = getToday()
  const teacher = signedInTeacher(state.staff)
  const teacherId = teacher?.id ?? ""
  const day = weekdayOf(today)
  // Own timetable plus any class assigned to this teacher as a substitute today (UR-03).
  const periods = teacherDuties(
    teacherId,
    today,
    state.slots,
    state.substitutions
  )
  const timeOf = (classId: string, periodIndex: number) =>
    state.slots.find(
      (slot) =>
        slot.classId === classId &&
        slot.day === day &&
        slot.periodIndex === periodIndex
    )
  const covering = periods.filter((duty) => duty.substitute).length
  const classIds = teacher?.classIds ?? []
  const weekly = schoolWeek(today).map(([date, label]) => {
    const marks = state.attendance.filter(
      (mark) => classIds.includes(mark.classId) && mark.date === date
    )
    const present = marks.filter((mark) =>
      isAttendancePresent(mark.status)
    ).length
    return {
      day: label,
      value: marks.length ? Math.round((present / marks.length) * 100) : 0,
    }
  })
  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground md:p-9">
        <div className="school-grid absolute inset-0 opacity-10" />
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary-foreground/60 uppercase">
            {day} · {formatDate(today)}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
            Good morning, {teacher?.name.split(" ")[0] ?? "teacher"}.
          </h2>
          <p className="mt-2 text-sm text-primary-foreground/70">
            You have {periods.length} periods today
            {covering
              ? `, including ${covering} substitute ${covering === 1 ? "class" : "classes"}`
              : ""}
            . You teach {teacher?.subject}.
          </p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => onOpen("attendance")}
          >
            <UserCheck data-icon="inline-start" />
            Start attendance
          </Button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today’s timetable</CardTitle>
            <CardDescription>
              Your periods and any substitute duty assigned by the operations
              manager
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {periods.length === 0 ? (
              <EmptyState
                title="No periods today"
                detail="Your assigned classes do not meet on this weekday."
              />
            ) : (
              periods.map((duty) => {
                const slot = timeOf(duty.classId, duty.periodIndex)
                return (
                  <div
                    key={`${duty.classId}-${duty.periodIndex}`}
                    className={`flex items-center gap-4 rounded-xl border p-3 ${duty.substitute ? "border-[var(--warning)]/40 bg-[var(--warning-light)]/40" : ""}`}
                  >
                    <p className="w-14 text-xs font-semibold">
                      P{duty.periodIndex}
                      <span className="block font-normal text-muted-foreground">
                        {slot?.time}
                      </span>
                    </p>
                    <Separator orientation="vertical" className="h-9" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {classLabel(state.classes, duty.classId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {duty.subject} · {slot?.room}
                      </p>
                    </div>
                    {duty.substitute ? (
                      <StatusBadge value="Substitute" />
                    ) : null}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Class pulse</CardTitle>
            <CardDescription>Attendance across your classes</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={attendanceConfig}
              className="h-[205px] w-full"
            >
              <BarChart data={weekly}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
