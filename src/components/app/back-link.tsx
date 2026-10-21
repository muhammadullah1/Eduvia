import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Compact "← Back" link for detail pages: brand hover, soft background and an arrow nudge. */
export function BackLink({
  onClick,
  children,
  className,
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group -mb-1 -ml-2 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[var(--cls-muted)] transition-colors",
        "hover:bg-[var(--secondary-color)] hover:text-[var(--primary-color)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]/35",
        className
      )}
    >
      <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
      <span className="underline-offset-4 group-hover:underline">{children}</span>
    </button>
  )
}
