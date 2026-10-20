import {
  CalendarRange,
  ClipboardList,
  FileText,
  PenLine,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  setup: CalendarRange,
  marks: PenLine,
  results: Trophy,
  documents: FileText,
  daily: ClipboardList,
}

type Item = { value: string; label: string }

export function ExamTabs({
  items,
  value,
  onValueChange,
}: {
  items: Item[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-1.5 shadow-sm">
      <div
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Examination sections"
      >
        {items.map((item) => {
          const active = value === item.value
          const Icon = ICONS[item.value] ?? ClipboardList
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "inline-flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-[var(--primary-color)] font-semibold text-white shadow-sm"
                  : "font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary-color)] hover:text-[var(--primary-color)]"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
