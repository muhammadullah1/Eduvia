import { FileBarChart2, Receipt, Wallet } from "lucide-react"
import { useState } from "react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
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

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="finance-page">
      <ClsSubTabs items={TABS} value={tab} onValueChange={setTab} aria-label="Finance" />
      {tab === "income" ? <IncomeTab month={month} /> : null}
      {tab === "expenses" ? <ExpensesTab month={month} /> : null}
      {tab === "report" ? <ReportTab period={period} onPeriod={setPeriod} /> : null}
    </div>
  )
}

/** The accountant's Expenses section: record expenses, list only their own, no totals. */
export function AccountantExpensesPage() {
  const [month, setMonth] = useState(() => getToday().slice(0, 7))
  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="accountant-expenses">
      <div className="flex justify-end">
        <MonthPicker value={month} onChange={setMonth} monthsBack={24} monthsAhead={0} aria-label="Month" className="w-full sm:w-44" />
      </div>
      <ExpensesTab month={month} ownOnly />
    </div>
  )
}
