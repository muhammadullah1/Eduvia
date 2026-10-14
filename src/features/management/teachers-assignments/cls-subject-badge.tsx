import { cn } from "@/lib/utils"

type Props = {
  label: string
  className?: string
}

export function ClsSubjectBadge({ label, className }: Props) {
  let text = label
  if (!text || text === "—") text = "Unassigned"

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900",
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden />
      <span className="truncate">{text}</span>
    </span>
  )
}
