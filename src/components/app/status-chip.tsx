import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type StatusChipTone =
  | "success"
  | "neutral"
  | "warning"
  | "danger"
  | "brand"

const toneStyles: Record<
  StatusChipTone,
  { box: string; dot?: string }
> = {
  success: {
    box: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-600",
  },
  neutral: {
    box: "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]",
    dot: "bg-[var(--cls-muted)]",
  },
  warning: {
    box: "border-amber-200/90 bg-amber-50 text-amber-900",
    dot: "bg-amber-600",
  },
  danger: {
    box: "border-red-200/90 bg-red-50 text-red-800",
    dot: "bg-red-600",
  },
  brand: {
    box: "border-[var(--cls-brand)]/25 bg-[var(--cls-brand)]/8 text-[var(--cls-brand)]",
    dot: "bg-[var(--cls-brand)]",
  },
}

type Props = {
  children: ReactNode
  tone?: StatusChipTone
  showDot?: boolean
  className?: string
}

export function StatusChip({
  children,
  tone = "neutral",
  showDot = false,
  className,
}: Props) {
  const styles = toneStyles[tone]
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight",
        styles.box,
        className
      )}
    >
      {showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", styles.dot)}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  )
}
