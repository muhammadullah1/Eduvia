import type { ComponentType, ReactNode } from "react"
import { ArrowRight, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export type PortalAction =
  | { kind: "admission" }
  | { kind: "payment"; studentId?: string }
  | { kind: "sync" }
  | { kind: "attendance"; className: string }
  | { kind: "marks"; sheetId?: string }
  | null

type Icon = ComponentType<{ className?: string }>

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "default",
}: {
  icon: Icon
  label: string
  value: string
  note: string
  tone?: "default" | "accent"
}) {
  return (
    <Card
      className={
        tone === "accent"
          ? "overflow-hidden border-primary/10 bg-primary text-primary-foreground"
          : "overflow-hidden"
      }
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={`grid size-10 place-items-center rounded-xl ${tone === "accent" ? "bg-primary-foreground/10" : "bg-muted"}`}
          >
            <Icon className="size-5" />
          </div>
          <Badge
            variant={tone === "accent" ? "outline" : "secondary"}
            className={
              tone === "accent"
                ? "border-primary-foreground/20 text-primary-foreground"
                : ""
            }
          >
            <TrendingUp className="size-3" /> live
          </Badge>
        </div>
        <p
          className={`mt-6 text-xs ${tone === "accent" ? "text-primary-foreground/60" : "text-muted-foreground"}`}
        >
          {label}
        </p>
        <p className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          {value}
        </p>
        <p
          className={`mt-2 text-xs ${tone === "accent" ? "text-primary-foreground/60" : "text-muted-foreground"}`}
        >
          {note}
        </p>
      </CardContent>
    </Card>
  )
}

export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ value }: { value: string }) {
  const good = [
    "Active",
    "Paid",
    "Published",
    "Present",
    "Complete",
    "Synced",
    "Completed",
    "Approved",
    "Enrolled",
    "Verified",
    "Settled",
    "Marked",
    "Ready",
  ]
  const warn = [
    "Pending",
    "Draft",
    "Partial",
    "In progress",
    "Marks in progress",
    "Review",
    "New",
    "Leave",
    "Next",
    "Upcoming",
    "Submitted",
    "Skipped",
  ]
  const bad = ["Absent", "Overdue", "Rejected", "Inactive", "Failed", "Blocked"]
  const tone = good.includes(value)
    ? "good"
    : warn.includes(value)
      ? "warn"
      : bad.includes(value)
        ? "bad"
        : "neutral"
  const className =
    tone === "good"
      ? "bg-success/10 text-success"
      : tone === "warn"
        ? "border-accent/30 bg-accent/15 text-accent-foreground"
        : tone === "bad"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : ""
  return (
    <Badge
      variant={tone === "good" ? "secondary" : "outline"}
      className={className}
    >
      {value}
    </Badge>
  )
}

export function EmptyNote({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  )
}

export function TextAction({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {children}
      <ArrowRight data-icon="inline-end" />
    </Button>
  )
}
