import { useQuery } from "@tanstack/react-query"
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react"
import type { ReactNode } from "react"

import schoolCatalogService from "@/api/settings/school-catalog.service"
import { cn } from "@/lib/utils"

function MetaTile({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-[10px] bg-[#F7F7F7] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--cls-muted)]">
        <Icon className="size-3" strokeWidth={2} />
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-medium text-[var(--cls-ink)]">
        {children}
      </div>
    </div>
  )
}

export function SchoolProfileCard({ className }: { className?: string }) {
  const { data: school, isLoading, isError } = useQuery({
    queryKey: ["schools", "current"],
    queryFn: () => schoolCatalogService.getCurrentSchool(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        <div className="flex items-center gap-3">
          <div className="size-14 rounded-2xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-5 w-52 rounded bg-slate-200" />
            <div className="h-3.5 w-28 rounded bg-slate-100" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[68px] rounded-[10px] bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !school) return null

  const statusLabel = school.status
    ? school.status.charAt(0).toUpperCase() + school.status.slice(1)
    : "Active"

  return (
    <div className={cn("space-y-5", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_srgb,var(--cls-brand)_14%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_srgb,var(--cls-brand)_5%,white),white)]"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-5 sm:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--cls-brand)] text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--cls-brand)_28%,transparent)]">
              <Building2 className="size-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cls-brand)]">
                School profile
              </p>
              <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-[var(--cls-ink)]">
                {school.name}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--cls-muted)]">
                Code{" "}
                <span className="font-mono font-semibold text-[var(--cls-ink)]">
                  {school.code}
                </span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {statusLabel}
          </span>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaTile icon={Phone} label="Phone">
          {school.phone || "—"}
        </MetaTile>
        <MetaTile icon={Mail} label="Email">
          {school.email || "—"}
        </MetaTile>
        <MetaTile icon={MapPin} label="Address">
          {school.address || "—"}
        </MetaTile>
        <MetaTile icon={Globe} label="Website">
          {school.website ? (
            <a
              href={school.website}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--cls-brand)] hover:underline"
            >
              {school.website}
            </a>
          ) : (
            "—"
          )}
        </MetaTile>
      </dl>
    </div>
  )
}
