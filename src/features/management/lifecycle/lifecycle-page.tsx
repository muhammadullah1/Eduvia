import { History, RefreshCcw } from "lucide-react"
import { useState } from "react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"

import { ChangeStatusPanel } from "./change-status-panel"
import { LifecycleHistoryPanel } from "./lifecycle-history-panel"

const TABS = [
  { value: "status", label: "Change status", icon: RefreshCcw },
  { value: "history", label: "History", icon: History },
]

/** /admin/lifecycle: student status changes (SRS 4.3.3) and the append-only lifecycle history. */
export function LifecyclePage() {
  const [tab, setTab] = useState("status")
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cls-ink)]">Student lifecycle</h1>
          <p className="mt-1 text-sm text-[var(--cls-muted)]">
            Activation, graduation, strike-off and readmission, with a full history of every change.
          </p>
        </div>
        <ClsSubTabs items={TABS} value={tab} onValueChange={setTab} aria-label="Student lifecycle" />
      </div>
      {tab === "status" ? <ChangeStatusPanel /> : <LifecycleHistoryPanel />}
    </div>
  )
}
