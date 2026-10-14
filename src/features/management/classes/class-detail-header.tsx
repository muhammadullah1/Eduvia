import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  meta?: string
  status?: "Active" | "Archived"
  onBack: () => void
  onEdit: () => void
}

export function ClassDetailHeader({
  title,
  meta,
  status = "Active",
  onBack,
  onEdit,
}: Props) {
  const active = status === "Active"

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-[10px] border-[var(--cls-border)] bg-[#eff1f1] text-[var(--cls-ink)] shadow-none hover:bg-[#e8eaea]"
          onClick={onBack}
          aria-label="Back to classes"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--cls-ink)]">
              {title}
            </h1>
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium",
                active
                  ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                  : "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  active ? "bg-emerald-600" : "bg-[var(--cls-muted)]"
                )}
                aria-hidden
              />
              {active ? "Active" : "Archived"}
            </span>
          </div>
          {meta ? (
            <p className="mt-1 text-[13px] text-[var(--cls-muted)]">{meta}</p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 border-[var(--cls-border)] px-4 text-sm font-medium"
        onClick={onEdit}
      >
        Edit class
      </Button>
    </div>
  )
}
