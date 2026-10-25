import type { LucideIcon } from "lucide-react"
import { type KeyboardEvent, type ReactNode,useRef } from "react"

import { cn } from "@/lib/utils"

export type ClsSubTabItem = {
  value: string
  label: string
  icon?: LucideIcon
  count?: number
  disabled?: boolean
}

type Props = {
  items: ClsSubTabItem[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  /** Content placed at the far end of the bar (filters, month pickers). */
  trailing?: ReactNode
  "aria-label"?: string
  /**
   * Wrap instead of scrolling: a two-column grid on phones, a wrapping row from
   * `sm` up, so no tab is ever hidden off-screen.
   */
  wrap?: boolean
}

/**
 * The portal's one tab bar: a light, bordered track with a raised white pill
 * for the selected tab. Supports icons, counts, hover, focus-visible rings,
 * and arrow / Home / End keyboard navigation (roving tab index).
 */
export function ClsSubTabs({
  items,
  value,
  onValueChange,
  className,
  trailing,
  "aria-label": ariaLabel = "Section tabs",
  wrap = false,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const enabled = items.filter((item) => !item.disabled)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = enabled.findIndex((item) => item.value === value)
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % enabled.length,
      ArrowLeft: (index - 1 + enabled.length) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    }
    const next = moves[event.key]
    if (next == null || !enabled.length) return
    event.preventDefault()
    const target = enabled[next]
    onValueChange(target.value)
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(target.value)}"]`)
      ?.focus()
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className={cn(
          "rounded-xl border border-[var(--cls-border)] bg-[var(--page-wash)] p-1",
          wrap
            ? "grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:max-w-full sm:flex-wrap sm:items-center"
            : "inline-flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {items.map((item) => {
          const active = value === item.value
          const Icon = item.icon
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              data-value={item.value}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[13px] whitespace-nowrap transition-[background-color,color,box-shadow,border-color] duration-150",
                wrap && "min-w-0 justify-center px-2 sm:justify-start sm:px-3.5",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]/35 focus-visible:ring-offset-1",
                active
                  ? "border-[var(--brand-border)] bg-white font-semibold text-[var(--primary-color)] shadow-[0_1px_2px_rgba(16,24,40,0.08),0_1px_3px_rgba(4,120,87,0.12)]"
                  : "border-transparent font-medium text-[var(--cls-muted)] hover:bg-white/70 hover:text-[var(--cls-ink)]",
                item.disabled && "pointer-events-none opacity-50"
              )}
            >
              {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
              {wrap ? <span className="truncate">{item.label}</span> : item.label}
              {item.count != null ? (
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums",
                    active
                      ? "bg-[var(--brand-100)] text-[var(--primary-hover)]"
                      : "bg-slate-200/70 text-[var(--cls-muted)]"
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
