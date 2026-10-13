type Props = {
  title: string
  detail: string
}

export function ClassDetailPlaceholderTab({ title, detail }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-14 text-center">
      <p className="text-base font-medium text-[var(--cls-ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--cls-muted)]">
        {detail}
      </p>
    </div>
  )
}
