import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GradeBand } from "@/data/types"
import { FAIL_GRADE, MAX_BANDS, MAX_GRADE_LENGTH } from "@/lib/grading"

const FULL_MARKS = 100
const cell = "px-3 py-2 align-middle"

function upperBound(bands: GradeBand[], band: GradeBand) {
  const higher = bands.filter((other) => other.min > band.min).map((other) => other.min)
  if (higher.length === 0) return FULL_MARKS
  return Math.min(...higher) - 1
}

/**
 * Editable letter-grade bands (Settings → Grading scale). Each row is a minimum
 * percentage and its grade; the maximum is derived from the next band up.
 */
export function GradingScaleEditor({
  bands,
  disabled,
  error,
  onChange,
}: {
  bands: GradeBand[]
  disabled: boolean
  error: string | null
  onChange: (bands: GradeBand[]) => void
}) {
  const update = (index: number, patch: Partial<GradeBand>) =>
    onChange(
      bands.map((band, i) => {
        if (i !== index) return band
        return { ...band, ...patch }
      })
    )
  const remove = (index: number) => onChange(bands.filter((_, i) => i !== index))
  const add = () => onChange([...bands, { min: 0, grade: "" }])

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-[var(--cls-border)]">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead className="bg-[var(--page-wash)] text-xs uppercase tracking-wider text-[var(--cls-muted)]">
            <tr>
              <th className={`${cell} font-semibold`}>Min %</th>
              <th className={`${cell} font-semibold`}>Max %</th>
              <th className={`${cell} font-semibold`}>Grade</th>
              <th className={cell}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cls-border)]">
            {bands.map((band, index) => (
              <tr key={index}>
                <td className={cell}>
                  <Input
                    className="h-9 w-20 tabular-nums"
                    inputMode="numeric"
                    disabled={disabled}
                    value={String(band.min)}
                    aria-label={`Band ${index + 1} minimum percent`}
                    onChange={(event) => update(index, { min: Number(event.target.value.replace(/\D/g, "")) })}
                  />
                </td>
                <td className={`${cell} tabular-nums text-[var(--cls-muted)]`}>{upperBound(bands, band)}</td>
                <td className={cell}>
                  <Input
                    className="h-9 w-20 font-semibold"
                    maxLength={MAX_GRADE_LENGTH}
                    disabled={disabled}
                    value={band.grade}
                    aria-label={`Band ${index + 1} grade`}
                    onChange={(event) => update(index, { grade: event.target.value })}
                  />
                </td>
                <td className={`${cell} text-right`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={`Remove band ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              <td className={`${cell} text-[var(--cls-muted)]`} colSpan={2}>
                Any failed paper
              </td>
              <td className={`${cell} font-semibold text-[var(--cls-muted)]`} colSpan={2}>
                {FAIL_GRADE}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" disabled={disabled || bands.length >= MAX_BANDS} onClick={add}>
          <Plus data-icon="inline-start" />
          Add band
        </Button>
        {error && (
          <p className="text-xs font-medium text-red-600" role="alert" data-testid="grading-error">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
