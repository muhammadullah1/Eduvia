import type { ComponentType, ReactNode } from "react"
import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const positive = new Set(["Active", "Paid", "Published", "Present", "Completed", "Approved", "Enrolled", "Verified", "Complete", "Admit", "Excused"])
const warning = new Set(["Pending", "Review", "Draft", "In progress", "Submitted", "Leave", "Late", "Next", "Upcoming", "New", "Planned", "Waitlist"])
const negative = new Set(["Rejected", "Absent", "Withdrawn", "Failed", "Reject", "Archived"])

export function StatusBadge({ value }: { value: string }) {
  const tone = positive.has(value) ? "good" : negative.has(value) ? "bad" : warning.has(value) ? "warn" : "neutral"
  const className = {
    good: "border-transparent bg-success/10 text-success",
    bad: "border-transparent bg-destructive/10 text-destructive",
    warn: "border-transparent bg-[var(--warning-light)] text-[var(--warning)]",
    neutral: "",
  }[tone]
  return <Badge variant="outline" className={className}>{value}</Badge>
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function MetricCard({ icon: Icon, label, value, note, tone = "default" }: { icon: ComponentType<{ className?: string }>; label: string; value: string; note: string; tone?: "default" | "accent" }) {
  const accent = tone === "accent"
  return (
    <Card className={accent ? "border-primary/10 bg-primary text-primary-foreground" : ""}>
      <CardContent className="p-5">
        <div className={`grid size-10 place-items-center rounded-xl ${accent ? "bg-primary-foreground/10" : "bg-muted"}`}>
          <Icon className="size-5" />
        </div>
        <p className={`mt-5 text-xs ${accent ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{label}</p>
        <p className="mt-1 font-heading text-3xl font-semibold tracking-tight">{value}</p>
        <p className={`mt-2 text-xs ${accent ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{note}</p>
      </CardContent>
    </Card>
  )
}

export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Pager({ page, pages, from, to, total, onPage }: { page: number; pages: number; from: number; to: number; total: number; onPage: (page: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">{total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
