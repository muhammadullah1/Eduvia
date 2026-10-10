import { Cell, Pie, PieChart } from "recharts"

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
import { isAttendancePresent } from "@/data/types"
import { getToday } from "@/lib/dates"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"

const attendanceConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  absent: { label: "Absent", color: "var(--chart-4)" },
  leave: { label: "Leave", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ParentAttendance() {
  const { state, child, childId, setChildId, options } = useChild()
  const currentMonth = getToday().slice(0, 7)
  const marks = state.attendance.filter(
    (mark) => mark.studentId === child.id && mark.date.startsWith(currentMonth)
  )
  const present = marks.filter((mark) =>
    isAttendancePresent(mark.status)
  ).length
  const absent = marks.filter((mark) => mark.status === "Absent").length
  const leave = marks.filter(
    (mark) => mark.status === "Leave" || mark.status === "Excused"
  ).length
  const late = marks.filter((mark) => mark.status === "Late").length
  const pie = [
    { name: "Present", value: present, fill: "var(--color-present)" },
    { name: "Absent", value: absent, fill: "var(--color-absent)" },
    { name: "Leave / Excused", value: leave, fill: "var(--color-leave)" },
    ...(late ? [{ name: "Late", value: late, fill: "var(--warning)" }] : []),
  ]
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <ChildSwitcher
          childId={childId}
          onChange={setChildId}
          options={options}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>September summary</CardTitle>
            <CardDescription>
              {marks.length} instructional days recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={attendanceConfig}
              className="mx-auto h-[240px] max-w-sm"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="name" />}
                />
                <Pie
                  data={pie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={96}
                  strokeWidth={4}
                >
                  {pie.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [present, "Present"],
                [absent, "Absent"],
                [leave, "Leave"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl bg-muted p-3">
                  <p className="font-heading text-xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily record</CardTitle>
            <CardDescription>Verified from the class register</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {marks.map((mark) => (
              <div
                key={mark.date}
                className={`grid aspect-square place-items-center rounded-xl border text-xs font-semibold ${mark.status === "Absent" ? "border-destructive/20 bg-destructive/10 text-destructive" : mark.status === "Leave" ? "border-accent/30 bg-accent/15" : "bg-success/10 text-success"}`}
                title={mark.status}
              >
                {Number(mark.date.slice(-2))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
