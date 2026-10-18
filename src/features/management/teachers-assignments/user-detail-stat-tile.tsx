type Props = {
  label: string
  value: string
  compact?: boolean
}

export function UserDetailStatTile({ label, value, compact }: Props) {
  let padding = "px-3 py-2.5"
  if (compact) padding = "px-2.5 py-2"

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/50 ${padding}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--cls-muted)]">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--cls-ink)]">{value}</p>
    </div>
  )
}
