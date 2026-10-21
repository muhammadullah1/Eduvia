import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const PERIOD_COUNT_MIN = 3
export const PERIOD_COUNT_MAX = 9
export const DEFAULT_PERIOD_COUNT = 8

export const PERIOD_COUNT_OPTIONS = Array.from(
  { length: PERIOD_COUNT_MAX - PERIOD_COUNT_MIN + 1 },
  (_, index) => PERIOD_COUNT_MIN + index
)

export function normalizePeriodCount(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PERIOD_COUNT
  if (value < PERIOD_COUNT_MIN) return PERIOD_COUNT_MIN
  if (value > PERIOD_COUNT_MAX) return PERIOD_COUNT_MAX
  return value
}

type Props = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function PeriodCountField({ value, onChange, disabled }: Props) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
        Periods per day
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {PERIOD_COUNT_OPTIONS.map((count) => (
              <SelectItem key={count} value={String(count)}>
                {count} periods
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="mt-1.5 text-xs text-[var(--cls-muted)]">
        Standard timetable capacity for this class (3–9). Shorter days, such as
        Friday, stay empty on the extra period rows — they are not a separate
        setting.
      </p>
    </div>
  )
}
