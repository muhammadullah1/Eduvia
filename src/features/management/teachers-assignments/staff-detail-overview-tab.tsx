import { Mail, Phone, Shield } from "lucide-react"
import type { ReactNode } from "react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"

type Props = {
  staff: StaffDirectoryRow
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode
  label: string
  value: string
  href?: string
}) {
  const body = (
    <>
      <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--page-wash)] text-[var(--cls-brand)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
        <p className="truncate text-sm font-semibold text-[var(--cls-ink)]">
          {value}
        </p>
      </div>
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        className="flex items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white p-4 transition-colors hover:border-[var(--cls-brand)]/30 hover:bg-[var(--page-wash)]/50"
      >
        {body}
      </a>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--cls-border)] bg-white p-4">
      {body}
    </div>
  )
}

export function StaffDetailOverviewTab({ staff }: Props) {
  return (
    <div className="grid max-w-3xl gap-4">
      <p className="text-sm text-[var(--cls-muted)]">
        Account and contact information for this portal user.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactCard
          icon={<Mail className="size-4" />}
          label="Email"
          value={staff.email}
          href={`mailto:${staff.email}`}
        />
        <ContactCard
          icon={<Phone className="size-4" />}
          label="Phone"
          value={staff.phone}
          href={
            staff.phone && staff.phone !== "—"
              ? `tel:${staff.phone}`
              : undefined
          }
        />
        <ContactCard
          icon={<Shield className="size-4" />}
          label="Portal role"
          value={staff.roleLabel}
        />
      </div>
    </div>
  )
}
