import { CalendarCheck, CheckCircle2, Clock, type LucideIcon, UserCheck, WalletCards } from "lucide-react"

import type { Dashboard, FinanceWidget, PendingWidget } from "@/api/dashboard/dashboard.service"
import { pkrAmount } from "@/features/finance/format"

import { percentChange, percentText, pointBefore } from "./dashboard-format"

export type Delta = { value: number | null; goodWhenUp: boolean; against: string }
export type Kpi = { key: string; label: string; value: string; note: string; icon: LucideIcon; delta?: Delta }

function lastTwo(finance: FinanceWidget) {
  const current = finance.trend.at(-1)
  const previous = finance.trend.at(-2)
  if (!current || !previous) return null
  return percentChange(current.amount, previous.amount)
}

/** Items waiting in every approval queue. */
export function pendingTotal(pending: PendingWidget) {
  return Object.values(pending).reduce((sum, n) => sum + n, 0)
}

/** Owner KPIs: money, absences and the approval queue, each with a trend where one exists. */
export function ownerKpis(data: Dashboard): Kpi[] {
  const w = data.widgets
  const out: Kpi[] = []
  if (w.finance) {
    const collected: Kpi = { key: "collected", label: "Fee collected", value: pkrAmount(w.finance.collected), note: `of ${pkrAmount(w.finance.expected)} billed`, icon: WalletCards }
    if (data.period.kind === "month") collected.delta = { value: lastTwo(w.finance), goodWhenUp: true, against: "vs last month" }
    out.push(collected)
    out.push({ key: "outstanding", label: "Outstanding dues", value: pkrAmount(w.finance.outstanding), note: `${w.finance.collectionRate}% of this period's bills paid`, icon: Clock })
  }
  if (w.attendance) {
    const { today, trend } = w.attendance
    const absence: Kpi = { key: "student-absence", label: "Students absent today", value: String(today.absent), note: "No register marked yet", icon: CalendarCheck }
    if (today.marked > 0) absence.note = `${today.marked} marked · ${percentText(today.percent)} present`
    const before = pointBefore(trend, data.today)
    if (before && today.marked > 0) absence.delta = { value: percentChange(today.absent, before.absent), goodWhenUp: false, against: "vs last school day" }
    out.push(absence)
  }
  if (w.absentTeachers) {
    const gaps = w.absentTeachers.reduce((sum, row) => sum + row.uncovered, 0)
    let note = "All periods covered"
    if (gaps > 0) note = `${gaps} periods need a substitute`
    out.push({ key: "teacher-absence", label: "Teachers absent today", value: String(w.absentTeachers.length), note, icon: UserCheck })
  }
  if (w.pending) out.push({ key: "pending", label: "Pending approvals", value: String(pendingTotal(w.pending)), note: "Waiting on you", icon: CheckCircle2 })
  return out
}
