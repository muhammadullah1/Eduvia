import type { ReactNode } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { FILTER_TRIGGER_CLASS, percentLabel, percentTone } from "./attendance-rules"
import { useReviewClasses } from "./use-review-classes"

/** Label above a control, matching the filter row in the design. */
export function FilterField({ id, label, children, className }: { id: string; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-[var(--cls-ink)]">
        {label}
      </Label>
      {children}
    </div>
  )
}

export function ClassSelect({
  id,
  value,
  onChange,
  allowAll = false,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  allowAll?: boolean
}) {
  const { classes, loading } = useReviewClasses()
  return (
    <Select value={value || (allowAll ? "all" : "")} onValueChange={(next) => onChange(next === "all" ? "" : next)} disabled={loading}>
      <SelectTrigger id={id} className={FILTER_TRIGGER_CLASS}>
        <SelectValue placeholder={loading ? "Loading classes…" : "Choose a class"} />
      </SelectTrigger>
      <SelectContent>
        {allowAll ? <SelectItem value="all">All classes</SelectItem> : null}
        {classes.map((klass) => (
          <SelectItem key={klass.id} value={klass.id}>
            {classDisplayName(klass)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Attendance % with a small bar; red below the threshold. */
export function PercentBar({ value, threshold }: { value: number | null; threshold: number }) {
  const tone = percentTone(value, threshold)
  const bar = tone === "danger" ? "bg-red-500" : tone === "warning" ? "bg-amber-500" : "bg-[var(--cls-brand)]"
  const text = tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-800" : "text-[var(--cls-brand)]"
  return (
    <div className="flex items-center gap-2" aria-label={`Attendance ${percentLabel(value)}`}>
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--page-wash)] ring-1 ring-[var(--cls-border)] ring-inset">
        {value !== null ? <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /> : null}
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", value === null ? "text-[var(--cls-muted)]" : text)}>
        {percentLabel(value)}
      </span>
    </div>
  )
}

export function LoadingRows({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2 p-4" aria-label={label}>
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-base font-medium text-[var(--cls-ink)]">Could not load {what}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

/** Small "Present: 5 · Absent: 1 · Late: 1" style counters for panel headers. */
export function Counts({ items }: { items: { label: string; value: number; className: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
      {items.map((item) => (
        <span key={item.label} className={item.className}>
          {item.label}: <span className="tabular-nums">{item.value}</span>
        </span>
      ))}
    </div>
  )
}
