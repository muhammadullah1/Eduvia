import { cn } from "@/lib/utils"

export type ExamTabItem = { value: string; label: string; count?: number }

/** Underline tabs from the exam mockups. The URL owns the active tab. */
export function ExamTabs({
  items,
  value,
  onValueChange,
  label = "Examination sections",
}: {
  items: ExamTabItem[]
  value: string
  onValueChange: (value: string) => void
  label?: string
}) {
  return (
    <div
      className="flex gap-6 overflow-x-auto border-b border-[var(--cls-border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-0.5 pt-1 pb-3 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-[#0F766E] font-semibold text-[#0F766E]"
                : "border-transparent font-medium text-[#64748B] hover:text-[#0F172A]"
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  active ? "bg-[#F0FDFA] text-[#0F766E]" : "bg-[#F1F5F9] text-[#64748B]"
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
