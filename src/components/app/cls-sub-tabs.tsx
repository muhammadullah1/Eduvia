import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type ClsSubTabItem = {
  value: string
  label: string
  count?: number
  disabled?: boolean
}

type Props = {
  items: ClsSubTabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  trailing?: ReactNode
  "aria-label"?: string
}

export function ClsSubTabs({
  items,
  value,
  onValueChange,
  className,
  trailing,
  "aria-label": ariaLabel = "Section tabs",
}: Props) {
  return (
    <div className={cn("border-b border-[var(--cls-border)]", className)}>
      <div className="flex items-center justify-between gap-4">
        <div
          className="-mb-px flex min-w-0 flex-1 items-center gap-5 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={ariaLabel}
        >
          {items.map((item) => {
            const active = value === item.value
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={item.disabled}
                onClick={() => onValueChange(item.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "border-[var(--cls-brand)] font-semibold text-[var(--cls-ink)]"
                    : "border-transparent font-medium text-[var(--cls-muted)] hover:text-[var(--cls-ink)]",
                  item.disabled && "pointer-events-none opacity-50"
                )}
              >
                {item.label}
                {item.count != null ? (
                  <span
                    className={cn(
                      "text-[11px] font-semibold tabular-nums",
                      active
                        ? "text-[var(--cls-brand)]"
                        : "text-[var(--cls-muted)]"
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        {trailing ? (
          <div className="shrink-0 pb-1">{trailing}</div>
        ) : null}
      </div>
    </div>
  )
}
