import { cn } from "@/lib/utils"

export function ClassStatusBadge({
  status,
}: {
  status: "Active" | "Archived"
}) {
  const active = status === "Active"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-[var(--cls-muted)]"
        )}
        aria-hidden
      />
      {active ? "Active" : "Archived"}
    </span>
  )
}
