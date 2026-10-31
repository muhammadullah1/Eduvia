import { GraduationCap } from "lucide-react"

import clsCrest from "@/assets/cls-crest.png"
import { cn } from "@/lib/utils"

/** School mark and name; `crest` shows the school's uploaded logo (or the default crest) instead of the generic mark. */
export function Logo({
  compact = false,
  crest = false,
  logoUrl,
}: {
  compact?: boolean
  crest?: boolean
  logoUrl?: string | null
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center overflow-hidden rounded-sm",
          crest && "rounded-md bg-white",
          !crest && "brand-mark size-10 rounded-xl text-primary-foreground shadow-sm"
        )}
      >
        {crest && <img src={logoUrl || clsCrest} alt="" className="size-9 object-contain" />}
        {!crest && <GraduationCap className="size-5" />}
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-heading text-sm font-semibold tracking-tight text-white">Creative Leaders</p>
          <p className="text-[11px] text-[var(--sidebar-inactive)]">Schools</p>
        </div>
      )}
    </div>
  )
}
