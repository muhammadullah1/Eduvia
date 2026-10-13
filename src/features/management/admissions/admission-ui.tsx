import { Check } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export const WIZARD_STEPS = [
  "Student",
  "Guardian",
  "Documents",
  "Interview",
  "Decision",
  "Enrollment",
] as const

export function AdmissionsPanel({
  className,
  children,
  noPadding,
}: {
  className?: string
  children: ReactNode
  noPadding?: boolean
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
        className
      )}
    >
      {noPadding ? children : children}
    </div>
  )
}

export function AdmissionsStatCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string
  value: string | number
  hint?: string
  accent?: "default" | "brand" | "warning" | "success"
}) {
  const valueClass =
    accent === "brand"
      ? "text-[var(--cls-brand)]"
      : accent === "warning"
        ? "text-amber-700"
        : accent === "success"
          ? "text-emerald-700"
          : "text-[var(--cls-ink)]"

  return (
    <div className="rounded-xl border border-[var(--cls-border)] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", valueClass)}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--cls-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}

export function AdmissionStepper({ step }: { step: number }) {
  const progress = ((step + 1) / WIZARD_STEPS.length) * 100

  return (
    <div className="flex flex-col gap-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cls-border)]">
        <div
          className="h-full rounded-full bg-[var(--cls-brand)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="flex min-w-[36rem] items-center gap-1">
        {WIZARD_STEPS.map((label, index) => {
          const active = index === step
          const complete = index < step
          return (
            <li key={label} className="flex flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    complete
                      ? "bg-[var(--cls-brand)] text-white"
                      : active
                        ? "border-2 border-[var(--cls-brand)] bg-white text-[var(--cls-brand)]"
                        : "border border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
                  )}
                >
                  {complete ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[4.5rem] truncate text-center text-[11px] font-medium",
                    active || complete
                      ? "text-[var(--cls-ink)]"
                      : "text-[var(--cls-muted)]"
                  )}
                >
                  {label}
                </span>
              </div>
              {index < WIZARD_STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-5 h-px flex-1",
                    complete ? "bg-[var(--cls-brand)]/40" : "bg-[var(--cls-border)]"
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function WizardStepHeader({
  title,
  description,
  step,
}: {
  title: string
  description?: string
  step: number
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-[var(--cls-muted)]">
        Step {step + 1} of {WIZARD_STEPS.length}
      </p>
      <h3 className="mt-0.5 text-base font-semibold text-[var(--cls-ink)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-[var(--cls-muted)]">{description}</p>
      ) : null}
    </div>
  )
}

export function AdmissionFieldLabel({
  children,
  required,
}: {
  children: ReactNode
  required?: boolean
}) {
  return (
    <span className="text-sm font-medium text-[var(--cls-ink)]">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </span>
  )
}

export function MandatoryNotice() {
  return (
    <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      Fields marked with <span className="text-destructive">*</span> are required
      to continue.
    </div>
  )
}

export function ReadOnlyRefCard({ refNo }: { refNo: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium text-[var(--cls-muted)]">
          Admission reference
        </p>
        <p className="font-mono text-sm font-semibold text-[var(--cls-brand)]">
          {refNo}
        </p>
      </div>
      <span className="inline-flex w-fit rounded-md border border-[var(--cls-border)] bg-white px-2.5 py-1 text-xs text-[var(--cls-muted)]">
        Auto-generated
      </span>
    </div>
  )
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        className
      )}
    >
      <h3 className="border-b border-[var(--cls-border)] px-5 py-3.5 text-sm font-semibold text-[var(--cls-ink)]">
        {title}
      </h3>
      <div className="px-5 py-4 text-sm text-[var(--cls-ink)]">{children}</div>
    </section>
  )
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
}

export function DetailItem({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-[var(--cls-muted)]">{label}</dt>
      <dd className="mt-1 font-medium text-[var(--cls-ink)]">{value}</dd>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}
