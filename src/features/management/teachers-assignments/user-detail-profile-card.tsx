import { Mail, Phone } from "lucide-react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"

import { ClsStatusBadge } from "./cls-status-badge"
import { StaffAvatar } from "./staff-avatar"
import { StaffRoleBadge } from "./staff-role-badge"

type Props = {
  staff: StaffDirectoryRow
}

function staffIdLabel(staff: StaffDirectoryRow) {
  if (staff.employeeCode && staff.employeeCode !== "—") {
    return staff.employeeCode
  }
  return `User #${staff.id}`
}

export function UserDetailProfileCard({ staff }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="bg-gradient-to-br from-[var(--cls-brand)]/12 via-[var(--page-wash)] to-white px-6 pb-6 pt-8">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left">
          <StaffAvatar
            name={staff.name}
            photoUrl={staff.photoUrl}
            size="lg"
            className="size-20 text-lg"
          />
          <div className="mt-4 min-w-0 flex-1 sm:mt-0">
            <h2
              className="text-xl font-semibold text-[var(--cls-ink)] break-words"
              title={staff.name}
            >
              {staff.name}
            </h2>
            <p
              className="mt-1 text-sm text-[var(--cls-muted)] break-all"
              title={staff.email}
            >
              {staff.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <StaffRoleBadge role={staff.role} />
              <ClsStatusBadge status={staff.status} />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 border-t border-[var(--cls-border)] px-6 py-5 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <Mail className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--cls-muted)]">Email</p>
            <p
              className="break-all text-sm font-medium text-[var(--cls-ink)]"
              title={staff.email}
            >
              {staff.email}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--page-wash)] text-[var(--cls-brand)]">
            <Phone className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--cls-muted)]">Phone</p>
            <p
              className="break-all text-sm font-medium text-[var(--cls-ink)]"
              title={staff.phone}
            >
              {staff.phone}
            </p>
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-[var(--cls-muted)]">
            Staff / employee ID
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--cls-ink)]">
            {staffIdLabel(staff)}
          </p>
        </div>
      </div>
    </div>
  )
}
