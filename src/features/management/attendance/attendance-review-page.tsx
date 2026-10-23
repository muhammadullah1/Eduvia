import { CalendarCheck, CalendarDays, CalendarRange, History, ShieldCheck, TrendingDown, UserX } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { useActor } from "@/lib/actor"
import { getToday } from "@/lib/dates"
import { can } from "@/lib/permissions"

import { AbsenteePanel } from "./absentee-panel"
import { ChangeHistoryPanel } from "./change-history-panel"
import { DailyPanel } from "./daily-panel"
import { LowAttendancePanel } from "./low-attendance-panel"
import { MonthlyPanel } from "./monthly-panel"
import { PrintSheetButton } from "./print-sheet-dialog"
import { SuperMasterPanel } from "./super-master-panel"
import { TodayPanel } from "./today-panel"
import { useReviewClasses } from "./use-review-classes"

const TABS = [
  { value: "today", label: "Today's status", icon: CalendarCheck },
  { value: "daily", label: "Daily report", icon: CalendarDays },
  { value: "monthly", label: "Monthly report", icon: CalendarRange },
  { value: "absentees", label: "Absentee list", icon: UserX },
  { value: "low", label: "Low attendance", icon: TrendingDown },
  { value: "history", label: "Change history", icon: History },
  { value: "super-masters", label: "Super Masters", icon: ShieldCheck },
]
const TAB_VALUES = TABS.map((tab) => tab.value)

/** /admin/student-attendance: management review of the attendance teachers record (SRS 6.3). */
export function AttendanceReviewPage() {
  const actor = useActor()
  const [params, setParams] = useSearchParams()
  const tab = TAB_VALUES.includes(params.get("tab") ?? "") ? (params.get("tab") as string) : "today"
  const today = getToday()
  const { classes } = useReviewClasses()
  const [pickedClass, setClassId] = useState("")
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const classId = pickedClass || classes.find((klass) => klass.status === "Active")?.id || classes[0]?.id || ""

  if (!can(actor.role, "attendance.review")) {
    return (
      <div className="rounded-xl border border-[var(--cls-border)] bg-white px-6 py-14 text-center text-sm text-[var(--cls-muted)]">
        Attendance review is available to the Super Admin and the Operations Manager.
      </div>
    )
  }

  const setTab = (value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === "today") next.delete("tab")
        else next.set("tab", value)
        return next
      },
      { replace: true }
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">Attendance review</h1>
            <p className="mt-1 text-sm text-[var(--cls-muted)]">
              Attendance recorded by teachers. Every change to a saved mark is logged with a reason.
            </p>
          </div>
          <PrintSheetButton classes={classes} defaultClassId={classId} />
        </div>
        <ClsSubTabs items={TABS} value={tab} onValueChange={setTab} aria-label="Attendance review" />
      </div>
      {tab === "today" ? <TodayPanel onAssign={() => setTab("super-masters")} /> : null}
      {tab === "daily" ? <DailyPanel classId={classId} date={date} onClassChange={setClassId} onDateChange={(value) => setDate(value || today)} /> : null}
      {tab === "monthly" ? (
        <MonthlyPanel classId={classId} month={month} onClassChange={setClassId} onMonthChange={setMonth} />
      ) : null}
      {tab === "absentees" ? <AbsenteePanel date={date} onDateChange={(value) => setDate(value || today)} /> : null}
      {tab === "low" ? <LowAttendancePanel month={month} onMonthChange={setMonth} /> : null}
      {tab === "history" ? <ChangeHistoryPanel /> : null}
      {tab === "super-masters" ? <SuperMasterPanel /> : null}
    </div>
  )
}
