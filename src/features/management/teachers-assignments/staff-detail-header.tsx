import { ArrowLeft } from "lucide-react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"

import { ClsStatusBadge } from "./cls-status-badge"
import { StaffAvatar } from "./staff-avatar"
import { StaffRoleBadge } from "./staff-role-badge"

type Props = {
  staff: StaffDirectoryRow
  onBack: () => void
}

export function StaffDetailHeader({ staff, onBack }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-[10px] border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-ink)] shadow-none hover:bg-[var(--cls-border)]/40"
          onClick={onBack}
          aria-label="Back to staff directory"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <StaffAvatar name={staff.name} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--cls-ink)]">
              {staff.name}
            </h1>
            <StaffRoleBadge role={staff.role} />
            <ClsStatusBadge status={staff.status} />
          </div>
          <p className="mt-1 truncate text-[13px] text-[var(--cls-muted)]">
            {staff.email}
          </p>
        </div>
      </div>
    </div>
  )
}
