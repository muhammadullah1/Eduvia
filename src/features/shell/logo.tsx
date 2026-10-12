import { GraduationCap } from "lucide-react"

import clsCrest from "@/assets/cls-crest.png"

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
        className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-sm ${inverted ? "bg-transparent" : "brand-mark size-10 rounded-xl text-primary-foreground shadow-sm"}`}
      >
        {inverted ? (
          <img
            src={clsCrest}
            alt=""
            className="size-9 object-contain"
          />
        ) : (
          <GraduationCap className="size-5" />
        )}
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
            Schools
          </p>
        </div>
      ) : null}
    </div>
  )
}
