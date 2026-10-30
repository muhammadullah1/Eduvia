import { BadgePercent, BookOpenText, CalendarRange, FileBarChart2, Layers } from "lucide-react"

import { FEE_REPORT_KINDS } from "@/api/fees/fee-reports.service"
import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { FeeReportsPanel } from "@/features/management/fee-reports"
import { Fees } from "@/features/management/fees"
import { useUrlTab } from "@/lib/use-url-tab"

import { FeeConcessionsPage } from "./fee-concessions/fee-concessions-page"
import { MonthlyGenerationPage } from "./fee-generation/generation-page"
import { FeeStructurePage } from "./fee-structure/fee-structure-page"

const ALL_FEE_REPORT_KINDS = FEE_REPORT_KINDS.map((k) => k.kind)

const TABS = [
  { value: "structure", label: "Fee Structure", icon: Layers },
  { value: "generation", label: "Monthly Generation", icon: CalendarRange },
  { value: "concessions", label: "Concessions", icon: BadgePercent },
  { value: "reports", label: "Fee Reports", icon: FileBarChart2 },
  { value: "ledger", label: "Ledger & receipts", icon: BookOpenText },
]
const TAB_IDS = ["structure", "generation", "concessions", "reports", "ledger"] as const

/** Fee Management for Super Admin: structure, generation, concessions, reports, ledger. */
export function FeeManagement({ query }: { query: string }) {
  const [tab, setTab] = useUrlTab(TAB_IDS)
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <ClsSubTabs items={TABS} value={tab} onValueChange={setTab} aria-label="Fee management" wrap />
      {tab === "structure" ? (
        <FeeStructurePage />
      ) : tab === "generation" ? (
        <MonthlyGenerationPage />
      ) : tab === "concessions" ? (
        <FeeConcessionsPage />
      ) : tab === "reports" ? (
        <FeeReportsPanel kinds={ALL_FEE_REPORT_KINDS} />
      ) : (
        <Fees query={query} />
      )}
    </div>
  )
}
