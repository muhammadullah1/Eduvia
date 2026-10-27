import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SettingsSearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <label
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-xl border border-[var(--cls-border)] bg-white px-4 transition-colors focus-within:border-[var(--primary-color)] focus-within:ring-2 focus-within:ring-[var(--primary-color)]/15",
        className
      )}
    >
      <Search className="size-5 shrink-0 text-[var(--cls-muted)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
    </label>
  )
}
