import type { Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { staffRoleLabel } from "@/api/staff/map-staff-directory"

const roleStyles: Partial<Record<Role, string>> = {
  teacher: "border-sky-200/90 bg-sky-50 text-sky-900",
  operations_manager: "border-violet-200/90 bg-violet-50 text-violet-900",
  accountant: "border-amber-200/90 bg-amber-50 text-amber-950",
  super_admin: "border-[var(--cls-brand)]/20 bg-[var(--cls-brand)]/10 text-[var(--cls-brand)]",
}

type Props = {
  role: Role
  className?: string
}

export function StaffRoleBadge({ role, className }: Props) {
  const label = staffRoleLabel(role)
  let box = roleStyles[role]
  if (!box) {
    box = "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-medium",
        box,
        className
      )}
    >
      {label}
    </span>
  )
}
