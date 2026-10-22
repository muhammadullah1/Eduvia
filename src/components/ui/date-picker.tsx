import { addYears, format, parseISO, startOfMonth, subYears } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useMemo } from "react"
import type { Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Typical school admission age: calendar opens around 8 years ago. */
const DEFAULT_ADMISSION_AGE_YEARS = 8

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  "aria-invalid"?: boolean
  "aria-label"?: string
  className?: string
  /** Years subtracted from today when no date is selected (default 8). */
  defaultAgeYears?: number
  /** Which month to show when no date is selected yet. */
  defaultMonthKind?: "admission" | "today"
  /** Extra classes on the calendar popover (e.g. `z-[100]` inside dialogs). */
  popoverClassName?: string
  /** Inclusive minimum selectable date (`yyyy-MM-dd`). */
  fromDate?: string
  /** Inclusive maximum selectable date (`yyyy-MM-dd`). */
  maxDate?: string
}

function toDate(iso: string) {
  if (!iso) return undefined
  try {
    return parseISO(iso.slice(0, 10))
  } catch {
    return undefined
  }
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  id,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  defaultAgeYears = DEFAULT_ADMISSION_AGE_YEARS,
  defaultMonthKind = "admission",
  popoverClassName,
  fromDate,
  maxDate,
}: DatePickerProps) {
  const selected = toDate(value)

  const disabledMatchers = useMemo(() => {
    const matchers: Matcher[] = []
    if (fromDate) {
      const min = toDate(fromDate)
      if (min) matchers.push({ before: min })
    }
    if (maxDate) {
      const max = toDate(maxDate)
      if (max) matchers.push({ after: max })
    }
    return matchers.length ? matchers : undefined
  }, [fromDate, maxDate])

  const defaultMonth = useMemo(() => {
    if (selected) return selected
    if (defaultMonthKind === "today") return new Date()
    return subYears(new Date(), defaultAgeYears)
  }, [selected, defaultAgeYears, defaultMonthKind])

  // Month and year dropdowns: bounded by min/max, otherwise 100 years back and 10 ahead.
  const startMonth = useMemo(
    () => startOfMonth(toDate(fromDate ?? "") ?? subYears(new Date(), 100)),
    [fromDate]
  )
  const endMonth = useMemo(
    () => startOfMonth(toDate(maxDate ?? "") ?? addYears(new Date(), 10)),
    [maxDate]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          data-slot="date-picker"
          data-empty={selected ? "false" : "true"}
          className={cn(
            "h-10 w-full justify-start border-[var(--cls-border)] bg-background text-left font-normal",
            selected ? "text-[var(--cls-ink)]" : "text-[var(--placeholder)]",
            className
          )}
        >
          <CalendarIcon className="size-4 opacity-70" />
          {selected ? format(selected, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0", popoverClassName)}
        align="start"
      >
        <Calendar
          mode="single"
          // Clicking the selected day again must not clear the value.
          required
          selected={selected}
          defaultMonth={defaultMonth}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={disabledMatchers}
          onSelect={(date: Date | undefined) => {
            if (date) onChange(format(date, "yyyy-MM-dd"))
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
