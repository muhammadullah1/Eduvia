import { cn } from "@/lib/utils"

type Props = {
  status: string
  className?: string
}

function statusStyles(normalized: string) {
  if (normalized === "active") {
    return {
      box: "border-emerald-200/90 bg-emerald-50 text-emerald-900",
      dot: "bg-emerald-600",
    }
  }
  if (normalized === "pending") {
    return {
      box: "border-amber-200/90 bg-amber-50 text-amber-950",
      dot: "bg-amber-600",
    }
  }
  return {
    box: "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]",
    dot: "bg-[var(--cls-muted)]",
  }
}

export function ClsStatusBadge({ status, className }: Props) {
  const normalized = status.toLowerCase()
  const styles = statusStyles(normalized)
  let label = status
  if (normalized === "active") label = "Active"
  if (normalized === "inactive") label = "Inactive"
  if (normalized === "pending") label = "Pending"

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
        styles.box,
        className
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
        aria-hidden
      />
      <span className="truncate capitalize">{label}</span>
    </span>
  )
}
