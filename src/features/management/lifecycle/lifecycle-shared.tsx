import type { ReactNode } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AcademicSession, ClassSection } from "@/data/types"

/** Label + control + inline error, shared by the lifecycle dialogs. */
export function FormField({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-[var(--cls-ink)]">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] leading-4 text-[var(--cls-muted)]">{hint}</p> : null}
    </div>
  )
}

export function SessionPicker({
  id,
  value,
  onChange,
  sessions,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  sessions: AcademicSession[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full border-[var(--cls-border)]">
        <SelectValue placeholder="Choose a session" />
      </SelectTrigger>
      <SelectContent>
        {sessions.map((session) => (
          <SelectItem key={session.id} value={session.id}>
            {session.name}
            {session.current ? " (current)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ClassPicker({
  id,
  value,
  onChange,
  classes,
  placeholder = "Choose a class",
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  classes: ClassSection[]
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full border-[var(--cls-border)]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {classes.map((klass) => (
          <SelectItem key={klass.id} value={klass.id}>
            {classDisplayName(klass)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
