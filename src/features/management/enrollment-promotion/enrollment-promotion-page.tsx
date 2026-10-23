import { ArrowUpRight, History, UserPlus } from "lucide-react"
import { useState } from "react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"

import { EnrollPanel } from "./enroll-panel"
import { HistoryPanel } from "./history-panel"
import { PromotePanel } from "./promote-panel"

const TABS = [
  { value: "promote", label: "Promote", icon: ArrowUpRight },
  { value: "enroll", label: "Enroll approved", icon: UserPlus },
  { value: "history", label: "Enrollment history", icon: History },
]

/** /admin/enrollment-promotion: class promotion, enrollment of approved applicants, and history. */
export function EnrollmentPromotionPage() {
  const [tab, setTab] = useState("promote")
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">Enrollment &amp; Promotion</h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Move a class up at year end, enroll approved applicants, and see every change. History is never
            overwritten.
          </p>
        </div>
        <ClsSubTabs items={TABS} value={tab} onValueChange={setTab} aria-label="Enrollment and promotion" />
      </div>
      {tab === "promote" ? <PromotePanel /> : null}
      {tab === "enroll" ? <EnrollPanel /> : null}
      {tab === "history" ? <HistoryPanel /> : null}
    </div>
  )
}
