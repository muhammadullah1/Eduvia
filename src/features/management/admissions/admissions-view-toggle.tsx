import { GitBranch, Table2 } from "lucide-react"

import { cn } from "@/lib/utils"

export type AdmissionsViewMode = "table" | "pipeline"

type Props = {
  value: AdmissionsViewMode
  onChange: (value: AdmissionsViewMode) => void
}

export function AdmissionsViewToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex shrink-0 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] p-1"
      role="group"
      aria-label="Admissions view"
    >
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
          value === "table"
            ? "bg-white text-[var(--cls-ink)] shadow-sm"
            : "text-[var(--cls-muted)] hover:text-[var(--cls-ink)]"
        )}
      >
        <Table2 className="size-4" />
        Table
      </button>
      <button
        type="button"
        onClick={() => onChange("pipeline")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
          value === "pipeline"
            ? "bg-white text-[var(--cls-ink)] shadow-sm"
            : "text-[var(--cls-muted)] hover:text-[var(--cls-ink)]"
        )}
      >
        <GitBranch className="size-4" />
        Pipeline
      </button>
    </div>
  )
}
