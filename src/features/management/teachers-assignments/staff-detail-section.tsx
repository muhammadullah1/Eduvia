import type { ReactNode } from "react"

type Props = {
  title: string
  description?: string
  children: ReactNode
}

export function StaffDetailSection({ title, description, children }: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--cls-ink)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--cls-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="text-xs font-medium text-[var(--cls-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--cls-ink)] sm:text-right">
        {value}
      </span>
    </div>
  )
}

export function StaffDetailFields({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="divide-y divide-[var(--cls-border)]">
      {items.map((item) => (
        <div key={item.label} className="py-3 first:pt-0 last:pb-0">
          <DetailField label={item.label} value={item.value} />
        </div>
      ))}
    </div>
  )
}
