import { Menu } from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function ClsMenuTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md p-[7px] text-[var(--cls-muted)] hover:bg-[var(--page-wash)]",
        className
      )}
      aria-label="Toggle navigation"
      onClick={toggleSidebar}
    >
      <Menu className="size-[18px]" />
    </button>
  )
}
