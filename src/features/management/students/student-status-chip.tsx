import { StatusChip, type StatusChipTone } from "@/components/app/status-chip"

const TONES: Record<string, StatusChipTone> = {
  Active: "success",
  Pending: "warning",
  Graduated: "brand",
  Inactive: "neutral",
  Withdrawn: "neutral",
  StruckOff: "danger",
}

const LABELS: Record<string, string> = { StruckOff: "Struck off" }

export function StudentStatusChip({ status }: { status: string }) {
  return (
    <StatusChip tone={TONES[status] ?? "neutral"} showDot>
      {LABELS[status] ?? status}
    </StatusChip>
  )
}
