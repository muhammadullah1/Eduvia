import { cn } from "@/lib/utils"

import type { SessionUiStatus } from "./session-status"

const LABEL: Record<SessionUiStatus, string> = {
  current: "Current",
  upcoming: "Upcoming",
  past: "Past",
}

export function SessionStatusBadge({ status }: { status: SessionUiStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "current" &&
          "border-emerald-200 bg-emerald-50 text-emerald-800",
        status === "upcoming" &&
          "border-sky-200 bg-sky-50 text-sky-800",
        status === "past" &&
          "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "current" && "bg-emerald-500",
          status === "upcoming" && "bg-sky-500",
          status === "past" && "bg-[var(--cls-muted)]"
        )}
        aria-hidden
      />
      {LABEL[status]}
    </span>
  )
}
