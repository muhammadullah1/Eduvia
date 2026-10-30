import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** One dashboard panel: title, optional caption and action, then content. */
export function WidgetCard({
  title,
  description,
  action,
  className,
  testId,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  testId?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("min-w-0", className)} data-testid={testId}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  )
}

export function WidgetEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}
