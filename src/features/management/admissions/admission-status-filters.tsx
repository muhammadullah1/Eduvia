import type { ReactNode } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ADMISSION_STATUS_LABELS,
  ADMISSION_STATUS_ORDER,
  type AdmissionStatusFilter,
} from "./admission-display"

type Props = {
  value: AdmissionStatusFilter
  onChange: (value: AdmissionStatusFilter) => void
  counts: Record<AdmissionStatusFilter, number>
  trailing?: ReactNode
}

function labelWithCount(label: string, count: number) {
  return `${label} (${count})`
}

export function AdmissionStatusFilters({
  value,
  onChange,
  counts,
  trailing,
}: Props) {
  const currentLabel =
    value === "all"
      ? labelWithCount("All", counts.all)
      : labelWithCount(ADMISSION_STATUS_LABELS[value], counts[value])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Select
        value={value}
        onValueChange={(next) => onChange(next as AdmissionStatusFilter)}
      >
        <SelectTrigger
          className="h-10 w-full min-w-[200px] max-w-xs border-[var(--cls-border)] bg-white sm:w-[240px]"
          aria-label="Admission status"
        >
          <SelectValue placeholder="Filter by status">{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">
              {labelWithCount("All", counts.all)}
            </SelectItem>
            {ADMISSION_STATUS_ORDER.map((id) => (
              <SelectItem key={id} value={id}>
                {labelWithCount(ADMISSION_STATUS_LABELS[id], counts[id])}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {trailing ? <div className="flex shrink-0 justify-end">{trailing}</div> : null}
    </div>
  )
}
