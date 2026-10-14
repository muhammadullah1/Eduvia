import { StatusChip } from "@/components/app/status-chip"

export function ClassStatusBadge({
  status,
}: {
  status: "Active" | "Archived"
}) {
  const active = status === "Active"
  return (
    <StatusChip
      tone={active ? "success" : "neutral"}
      showDot
      className="py-1"
    >
      {active ? "Active" : "Archived"}
    </StatusChip>
  )
}
