import type { ExamPhase, ExamStatus } from "@/api/exams/exams.service"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Same badge shape and palette as AdmissionStatusBadge.
const GRAY = "border-transparent bg-[#f2f4f7] text-[#344054] [&_[data-status-dot]]:bg-[#667085]"
const BLUE = "border-transparent bg-[#eff8ff] text-[#175cd3] [&_[data-status-dot]]:bg-[#2e90fa]"
const AMBER = "border-transparent bg-[#fffaeb] text-[#b54708] [&_[data-status-dot]]:bg-[#f79009]"
const INDIGO = "border-transparent bg-[#eef4ff] text-[#3538cd] [&_[data-status-dot]]:bg-[#6172f3]"
const GREEN = "border-transparent bg-[#ecfdf3] text-[#027a48] [&_[data-status-dot]]:bg-[#12b76a]"

const LABELS: Record<string, string> = { MarksEntered: "Marks entered" }

const STYLES: Record<string, string> = {
  Draft: GRAY,
  Archived: GRAY,
  Scheduled: BLUE,
  Submitted: BLUE,
  "Marks Pending": AMBER,
  MarksEntered: AMBER,
  Verified: INDIGO,
  Finalised: INDIGO,
  Published: GREEN,
}

export function ExamStatusPill({ status, className }: { status: ExamStatus | string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status] ?? GRAY, className)}
    >
      <span data-status-dot className="size-1.5 shrink-0 rounded-full" aria-hidden />
      {LABELS[status] ?? status}
    </Badge>
  )
}

const PHASES: Record<ExamPhase, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "border-[#b2ddff] text-[#175cd3]" },
  ongoing: { label: "In progress", className: "border-[#fedf89] text-[#b54708]" },
  past: { label: "Ended", className: "border-[var(--cls-border)] text-[var(--cls-muted)]" },
}

/** Where the exam sits on its timeline, next to the results status. */
export function ExamPhaseTag({ phase }: { phase: ExamPhase }) {
  const style = PHASES[phase]
  return (
    <span className={cn("rounded-full border bg-white px-2.5 py-0.5 text-xs font-medium", style.className)}>
      {style.label}
    </span>
  )
}
