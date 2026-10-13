import { Clock } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type TimePickerProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  className?: string
  minuteStep?: number
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim())
  if (!match) return { hour: "08", minute: "00" }
  return { hour: match[1], minute: match[2] }
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function TimePicker({
  value,
  onChange,
  disabled,
  id,
  className,
  minuteStep = 5,
}: TimePickerProps) {
  const { hour, minute } = parseTime(value)

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => pad2(i)),
    []
  )
  const minutes = useMemo(() => {
    const items: string[] = []
    for (let m = 0; m < 60; m += minuteStep) {
      items.push(pad2(m))
    }
    return items
  }, [minuteStep])

  const displayMinute = useMemo(() => {
    if (minutes.includes(minute)) return minute
    const numeric = Number(minute)
    if (!Number.isFinite(numeric)) return minutes[0] ?? "00"
    const snapped =
      Math.round(numeric / minuteStep) * minuteStep
    const clamped = Math.min(59, Math.max(0, snapped))
    const padded = pad2(clamped)
    return minutes.includes(padded) ? padded : minutes[0] ?? "00"
  }, [minute, minutes, minuteStep])

  function emit(nextHour: string, nextMinute: string) {
    onChange(`${nextHour}:${nextMinute}`)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 justify-start gap-2 border-[var(--cls-border)] bg-white px-2.5 text-xs font-medium tabular-nums text-[var(--cls-ink)]",
            className
          )}
        >
          <Clock className="size-3.5 opacity-70" />
          {value && /^\d{2}:\d{2}$/.test(value) ? value : "Set time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="mb-2 text-xs font-medium text-[var(--cls-muted)]">
          Start time
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={hour}
            onValueChange={(nextHour) => emit(nextHour, displayMinute)}
          >
            <SelectTrigger className="h-9 w-[4.5rem] tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectGroup>
                {hours.map((h) => (
                  <SelectItem key={h} value={h} className="tabular-nums">
                    {h}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span className="text-sm font-semibold text-[var(--cls-muted)]">:</span>
          <Select
            value={displayMinute}
            onValueChange={(nextMinute) => emit(hour, nextMinute)}
          >
            <SelectTrigger className="h-9 w-[4.5rem] tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectGroup>
                {minutes.map((m) => (
                  <SelectItem key={m} value={m} className="tabular-nums">
                    {m}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
