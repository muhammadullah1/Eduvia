import { FileBarChart2, Plus, Receipt, Wallet } from "lucide-react"
import { useState } from "react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "@/components/ui/month-picker"
import { getToday } from "@/lib/dates"
import { useUrlTab } from "@/lib/use-url-tab"

import { ExpensesTab } from "./expenses-tab"
import { IncomeTab } from "./income-tab"
import { ReportTab } from "./report-tab"

const TABS = [
  { value: "income", label: "Income", icon: Wallet },
  { value: "expenses", label: "Expenses", icon: Receipt },
  { value: "report", label: "Financial Report", icon: FileBarChart2 },
]
const TAB_IDS = ["income", "expenses", "report"] as const

/**
 * Finance (Step 8, Figma 127-74391): Income, Expenses and Financial Report. Super Admin only.
 * The tab lives in `?tab=`. As in the Figma frames, Income and Expenses have no month
 * picker: they show the current month ("Total Income (Sep 2026)"); history is in the report.
 */
export function FinancePage() {
  const [tab, setTab] = useUrlTab(TAB_IDS)
  const month = getToday().slice(0, 7)
  const [period, setPeriod] = useState(() => getToday().slice(0, 7))
  const [addTrigger, setAddTrigger] = useState(0)

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="finance-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClsSubTabs items={TABS} value={tab} onValueChange={setTab} aria-label="Finance" />
        {tab === "income" ? (
          <Button onClick={() => setAddTrigger((n) => n + 1)} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Add Other Income
          </Button>
        ) : tab === "expenses" ? (
          <Button onClick={() => setAddTrigger((n) => n + 1)} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" />
            Add Expense
          </Button>
        ) : null}
      </div>
      {tab === "income" ? <IncomeTab month={month} addTrigger={addTrigger} hideAddButton /> : null}
      {tab === "expenses" ? <ExpensesTab month={month} addTrigger={addTrigger} hideAddButton /> : null}
      {tab === "report" ? <ReportTab period={period} onPeriod={setPeriod} /> : null}
    </div>
  )
}

/** The accountant's Expenses section: record expenses, list only their own, no totals. */
export function AccountantExpensesPage() {
  const [month, setMonth] = useState(() => getToday().slice(0, 7))
  const [addTrigger, setAddTrigger] = useState(0)
  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="accountant-expenses">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button onClick={() => setAddTrigger((n) => n + 1)} className="w-full sm:w-auto">
          <Plus data-icon="inline-start" />
          Add Expense
        </Button>
        <MonthPicker value={month} onChange={setMonth} monthsBack={24} monthsAhead={0} aria-label="Month" className="w-full sm:w-44" />
      </div>
      <ExpensesTab month={month} ownOnly addTrigger={addTrigger} hideAddButton />
    </div>
  )
}
