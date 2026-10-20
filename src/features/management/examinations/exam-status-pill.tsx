import type { ExamStatus } from "@/api/exams/exams.service"
import { cn } from "@/lib/utils"

// Brand palette: teal for done/live states, soft teal for in-progress, slate for idle.
const STYLES: Record<string, string> = {
  Published: "bg-[#0F766E] text-white",
  Finalised: "bg-[#CCFBF1] text-[#115E59]",
  Verified: "bg-[#CCFBF1] text-[#115E59]",
  Submitted: "bg-[#F0FDFA] text-[#0F766E] ring-1 ring-inset ring-[#99F6E4]",
  Scheduled: "bg-[#F0FDFA] text-[#0F766E] ring-1 ring-inset ring-[#99F6E4]",
  "Marks Pending": "bg-[#FEF3C7] text-[#92400E]",
  Draft: "bg-[#F1F5F9] text-[#475569]",
  Archived: "bg-[#F1F5F9] text-[#64748B]",
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
