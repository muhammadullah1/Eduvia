import type { ReactNode } from "react"

import { ClsSubTabs } from "@/components/app/cls-sub-tabs"

import {
  ADMISSION_STATUS_LABELS,
  ADMISSION_STATUS_ORDER,
  type AdmissionStatusFilter,
  type AdmissionUiStatus,
} from "./admission-display"

type Props = {
  value: AdmissionStatusFilter
  onChange: (value: AdmissionStatusFilter) => void
  counts: Record<AdmissionStatusFilter, number>
  trailing?: ReactNode
}

export function AdmissionStatusFilters({
  value,
  onChange,
  counts,
  trailing,
}: Props) {
  const items = [
    { value: "all", label: "All", count: counts.all },
    ...ADMISSION_STATUS_ORDER.map((id) => ({
      value: id,
      label: ADMISSION_STATUS_LABELS[id],
      count: counts[id],
    })),
  ]

  return (
    <ClsSubTabs
      aria-label="Admission status"
      items={items}
      value={value}
      onValueChange={(next) => onChange(next as AdmissionStatusFilter)}
      trailing={trailing}
    />
  )
}

export type { AdmissionUiStatus }
