import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ClassStatusBadge } from "@/features/management/classes/class-status-badge"

type Props = {
  title: string
  meta: string
  onBack: () => void
  onEdit: () => void
}

export function ClassDetailHeader({ title, meta, onBack, onEdit }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-0.5 shrink-0 text-[var(--cls-muted)]"
          onClick={onBack}
          aria-label="Back to classes"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--cls-brand)]">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--cls-muted)]">{meta}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ClassStatusBadge status="Active" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-[var(--cls-border)] text-[13px]"
          onClick={onEdit}
        >
          Edit Class
        </Button>
      </div>
    </div>
  )
}
