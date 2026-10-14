import type { Role } from "@/lib/auth"
import { cn } from "@/lib/utils"

import { staffRoleLabel } from "@/api/staff/map-staff-directory"

const roleStyles: Partial<Record<Role, { box: string; dot: string }>> = {
  teacher: {
    box: "border-emerald-200/90 bg-emerald-50 text-emerald-900",
    dot: "bg-emerald-600",
  },
  operations_manager: {
    box: "border-violet-200/90 bg-violet-50 text-violet-900",
    dot: "bg-violet-600",
  },
  accountant: {
    box: "border-amber-200/90 bg-amber-50 text-amber-950",
    dot: "bg-amber-600",
  },
  super_admin: {
    box: "border-[var(--cls-brand)]/25 bg-[var(--cls-brand)]/10 text-[var(--cls-brand)]",
    dot: "bg-[var(--cls-brand)]",
  },
}

type Props = {
  role: Role
  className?: string
}

export function StaffRoleBadge({ role, className }: Props) {
  const label = staffRoleLabel(role)
  let styles = roleStyles[role]
  if (!styles) {
    styles = {
      box: "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]",
      dot: "bg-[var(--cls-muted)]",
    }
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles.box,
        className
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  )
}
