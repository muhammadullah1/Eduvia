type Props = {
  label: string
  value: string
}

export function UserDetailStatTile({ label, value }: Props) {
  return (
    <div className="flex min-w-[120px] flex-1 flex-col gap-1.5 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--cls-muted)]">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--cls-ink)]">{value}</p>
    </div>
  )
}
