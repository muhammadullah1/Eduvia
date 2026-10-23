import { addMonths, format, parse, startOfMonth, subMonths } from "date-fns"
import { useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type MonthPickerProps = {
  /** `yyyy-MM`. */
  value: string
  onChange: (value: string) => void
  /** Months offered before and after the current month. */
  monthsBack?: number
  monthsAhead?: number
  className?: string
  id?: string
  "aria-label"?: string
}

/**
 * Month selector built on shadcn Select (replaces native `<input type="month">`).
 * Uses the default SelectTrigger size/styles so it lines up with other Selects in a filter row.
 */
export function MonthPicker({
  value,
  onChange,
  monthsBack = 24,
  monthsAhead = 12,
  className,
  id,
  "aria-label": ariaLabel = "Month",
}: MonthPickerProps) {
  const options = useMemo(() => {
    const now = startOfMonth(new Date())
    const keys = new Set<string>()
    for (let d = subMonths(now, monthsBack); d <= addMonths(now, monthsAhead); d = addMonths(d, 1)) {
      keys.add(format(d, "yyyy-MM"))
    }
    if (/^\d{4}-\d{2}$/.test(value)) keys.add(value)
    return [...keys].sort().reverse().map((key) => ({
      value: key,
      label: format(parse(key, "yyyy-MM", new Date()), "MMMM yyyy"),
    }))
  }, [value, monthsBack, monthsAhead])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-40", className)}>
        <SelectValue placeholder="Pick a month" />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
