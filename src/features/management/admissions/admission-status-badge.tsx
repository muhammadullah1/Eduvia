import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  ADMISSION_STATUS_LABELS,
  type AdmissionUiStatus,
  admissionStatusBadgeClass,
} from "./admission-display"

export function AdmissionStatusBadge({
  status,
  className,
}: {
  status: AdmissionUiStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        admissionStatusBadgeClass[status],
        className
      )}
    >
      <span
        data-status-dot
        className="size-1.5 shrink-0 rounded-full"
        aria-hidden
      />
      {ADMISSION_STATUS_LABELS[status]}
    </Badge>
  )
}
