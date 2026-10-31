import { useMemo } from "react"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getToday } from "@/lib/dates"

import { periodOptions } from "./periods"

/** Month / FY quarter / FY picker shared by Finance reports and the dashboard, so labels match. */
export function PeriodSelect({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  const options = useMemo(() => periodOptions(getToday()), [])
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Period" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectGroup>
          <SelectLabel>Month</SelectLabel>
          {options.months.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Quarter (financial year)</SelectLabel>
          {options.quarters.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Financial year (Apr – Mar)</SelectLabel>
          {options.years.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
