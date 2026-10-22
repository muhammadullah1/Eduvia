import { StatusChip } from "@/components/app/status-chip"
import type { ClassStatus } from "@/data/types"

const LABEL: Record<ClassStatus, string> = {
  Active: "Active",
  Inactive: "Inactive",
  Archived: "Archived",
}

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return (
    <StatusChip
      tone={status === "Active" ? "success" : status === "Inactive" ? "warning" : "neutral"}
      showDot
      className="py-1"
    >
      {LABEL[status]}
    </StatusChip>
  )
}
