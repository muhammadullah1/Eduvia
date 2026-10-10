import { cn } from "@/lib/utils"

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
}

export function AdmissionStatusFilters({ value, onChange, counts }: Props) {
  const items: { id: AdmissionStatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    ...ADMISSION_STATUS_ORDER.map((id) => ({
      id,
      label: ADMISSION_STATUS_LABELS[id],
    })),
  ]

  return (
    <div className="flex w-full flex-wrap gap-2">
      {items.map((item) => {
        const active = value === item.id
        const count = counts[item.id]
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors sm:h-9 sm:gap-2 sm:px-3 sm:text-sm",
              active
                ? "border-[var(--cls-brand)] bg-[var(--cls-brand)] text-white shadow-sm"
                : "border-[var(--cls-border)] bg-white text-[var(--cls-muted)] hover:border-[var(--cls-brand)]/30 hover:text-[var(--cls-ink)]"
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                "inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1.5 text-xs font-semibold",
                active
                  ? "bg-white/20 text-white"
                  : "bg-[var(--page-wash)] text-[var(--cls-muted)]"
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export type { AdmissionUiStatus }
