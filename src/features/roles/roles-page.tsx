import { History, ShieldCheck } from "lucide-react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { useUrlTab } from "@/lib/use-url-tab"

import { RoleActivity } from "./role-activity"
import { RolesList } from "./roles-list"

const TABS = ["roles", "activity"] as const

const TAB_ITEMS = [
  { value: "roles", label: "Roles", icon: ShieldCheck },
  { value: "activity", label: "Activity", icon: History },
]

export function RolesPage() {
  const [tab, setTab] = useUrlTab(TABS)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--heading)]">
          Roles &amp; Permissions
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--cls-muted)]">
          Choose what each role can see and do. Changes apply to everyone in the role on their
          next request.
        </p>
      </div>
      <ClsSubTabs aria-label="Roles and permissions" value={tab} onValueChange={setTab} items={TAB_ITEMS} />
      {tab === "roles" && <RolesList />}
      {tab === "activity" && <RoleActivity />}
    </div>
  )
}
