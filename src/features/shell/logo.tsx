import { GraduationCap } from "lucide-react"

export function Logo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean
  inverted?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid size-10 shrink-0 place-items-center rounded-xl shadow-sm ${inverted ? "bg-white text-[var(--primary-color)]" : "brand-mark text-primary-foreground"}`}
      >
        <GraduationCap className="size-5" />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <p
            className={`font-heading text-sm font-semibold tracking-tight ${inverted ? "text-white" : ""}`}
          >
            Creative Leaders
          </p>
          <p
            className={`text-[11px] ${inverted ? "text-[var(--sidebar-inactive)]" : "text-muted-foreground"}`}
          >
            School operating system
          </p>
        </div>
      ) : null}
    </div>
  )
}
