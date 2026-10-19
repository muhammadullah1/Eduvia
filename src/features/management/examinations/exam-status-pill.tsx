import type { ExamStatus } from "@/api/exams/exams.service"
import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-700",
  Finalised: "bg-teal-50 text-teal-700",
  Scheduled: "bg-sky-50 text-sky-700",
  "Marks Pending": "bg-amber-50 text-amber-700",
  Draft: "bg-slate-100 text-slate-600",
  Submitted: "bg-sky-50 text-sky-700",
  Verified: "bg-teal-50 text-teal-700",
  Archived: "bg-slate-100 text-slate-500",
}

export function ExamStatusPill({ status }: { status: ExamStatus | string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        STYLES[status] ?? STYLES.Draft
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  )
}
