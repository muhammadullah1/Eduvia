import type { FeeType } from "@/api/fees/fee-structure.service"
import { cn } from "@/lib/utils"

const PILL: Record<FeeType, string> = {
  Tuition: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Admission: "border-sky-200 bg-sky-50 text-sky-800",
  Exam: "border-amber-200 bg-amber-50 text-amber-900",
  Annual: "border-violet-200 bg-violet-50 text-violet-800",
  Promotion: "border-teal-200 bg-teal-50 text-teal-900",
}

export function FeeTypePill({ type, className }: { type: FeeType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PILL[type],
        className
      )}
    >
      {type}
    </span>
  )
}
