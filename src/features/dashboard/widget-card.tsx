import { ArrowUpRight, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** One dashboard panel: title, optional badge, caption and action, then content. */
export function WidgetCard({
  title,
  description,
  badge,
  action,
  className,
  testId,
  children,
}: {
  title: string
  description?: string
  badge?: ReactNode
  action?: ReactNode
  className?: string
  testId?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("min-w-0 gap-3 rounded-xl border-[var(--cls-border)] py-4 shadow-none", className)} data-testid={testId}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-[15px] font-semibold text-[var(--cls-ink)]">{title}</CardTitle>
            {badge}
          </div>
          {description && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="min-w-0 px-4 sm:px-5">{children}</CardContent>
    </Card>
  )
}

/** Header link to the full page behind a widget (the arrow in the ASAMAN panels). */
export function WidgetLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-primary" aria-label={label} onClick={onClick}>
      <ArrowUpRight className="size-4" />
    </Button>
  )
}

/** Small pill next to a widget title, e.g. "3 absent". */
export function WidgetBadge({ tone = "teal", children }: { tone?: "teal" | "red" | "amber"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "teal" && "bg-[var(--secondary-color)] text-primary",
        tone === "red" && "bg-[var(--error-light)] text-destructive",
        tone === "amber" && "bg-[var(--warning-light)] text-[var(--warning)]"
      )}
    >
      {children}
    </span>
  )
}

/** Friendly empty state: an icon, one line of status and an optional hint. */
export function WidgetEmpty({ icon: Icon, hint, children }: { icon?: LucideIcon; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      {Icon && (
        <span className="grid size-10 place-items-center rounded-full bg-[var(--secondary-color)] text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-[var(--cls-ink)]">{children}</p>
      {hint && <p className="max-w-64 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
