import { cn } from "@/lib/utils"

type Props = {
  labels: string[]
  maxVisible?: number
  className?: string
}

export function SubjectClassTags({
  labels,
  maxVisible = 4,
  className,
}: Props) {
  if (labels.length === 0) {
    return (
      <span className="text-sm text-[var(--cls-muted)]">Not scheduled</span>
    )
  }

  const visible = labels.slice(0, maxVisible)
  const overflow = labels.length - visible.length

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((label) => (
        <span
          key={label}
          className="inline-flex rounded-md border border-[var(--cls-border)] bg-[var(--page-wash)] px-2 py-0.5 text-xs font-medium text-[var(--cls-ink)]"
        >
          {label}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="text-xs font-semibold text-[var(--cls-muted)]">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
