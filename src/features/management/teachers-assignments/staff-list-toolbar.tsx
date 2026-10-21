import { Filter, Search } from "lucide-react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type StaffListTab = "all" | "teachers" | "office"

type Props = {
  tab: StaffListTab
  onTabChange: (tab: StaffListTab) => void
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
}

export function StaffListToolbar({
  tab,
  onTabChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  let statusLabel = "All statuses"
  if (statusFilter === "active") statusLabel = "Active only"
  if (statusFilter === "inactive") statusLabel = "Inactive only"

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <ClsSubTabs
        aria-label="Staff filters"
        value={tab}
        onValueChange={(value) => onTabChange(value as StaffListTab)}
        items={[
          { value: "all", label: "All staff" },
          { value: "teachers", label: "Teachers" },
          { value: "office", label: "Office roles" },
        ]}
      />
      <div className="flex w-full flex-1 items-center gap-3 lg:max-w-xl">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[var(--cls-muted)]"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search staff"
            className="h-10 border-[var(--cls-border)] bg-[var(--page-wash)] pl-10 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 border-[var(--cls-border)]"
              aria-label="Filter staff"
            >
              <Filter className="size-5 text-[var(--cls-muted)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onStatusFilterChange("")}>
                {statusFilter === "" ? "✓ " : ""}All statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusFilterChange("active")}>
                {statusFilter === "active" ? "✓ " : ""}Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusFilterChange("inactive")}>
                {statusFilter === "inactive" ? "✓ " : ""}Inactive
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] font-normal text-[var(--cls-muted)]">
              {statusLabel}
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
