import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ClassStatus } from "@/data/types"

import { ClassStatusBadge } from "./class-status-badge"

type Props = {
  title: string
  meta?: string
  status?: ClassStatus
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
            <ClassStatusBadge status={status} />
          </div>
          {meta ? (
            <p className="mt-1 text-[13px] text-[var(--cls-muted)]">{meta}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-[var(--cls-border)] px-4 text-sm font-medium"
            onClick={onEdit}
          >
            Edit class
          </Button>
        </div>
        {status !== "Archived" ? (
          <p className="text-xs text-[var(--cls-muted)]">
            Status follows enrolment: active while students are enrolled.
          </p>
        ) : null}
      </div>
    </div>
  )
}
