import { useQuery } from "@tanstack/react-query"
import { Building2 } from "lucide-react"

import schoolCatalogService from "@/api/settings/school-catalog.service"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SchoolProfileCard() {
  const { data: school, isLoading, isError } = useQuery({
    queryKey: ["schools", "current"],
    queryFn: () => schoolCatalogService.getCurrentSchool(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isLoading) {
    return (
      <Card className="border-[var(--cls-border)] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-1 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </CardHeader>
      </Card>
    )
  }

  if (isError || !school) return null

  return (
    <Card className="border-[var(--cls-border)] bg-white shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--cls-brand)]/10 text-[var(--cls-brand)]">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[var(--cls-ink)]">
                {school.name}
              </CardTitle>
              <CardDescription>
                School code:{" "}
                <span className="font-mono font-medium text-[var(--cls-ink)]">
                  {school.code}
                </span>
              </CardDescription>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {school.status
              ? school.status.charAt(0).toUpperCase() + school.status.slice(1)
              : "Active"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[var(--cls-muted)]">Phone</dt>
            <dd className="mt-0.5 font-medium text-[var(--cls-ink)]">
              {school.phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cls-muted)]">Email</dt>
            <dd className="mt-0.5 truncate font-medium text-[var(--cls-ink)]">
              {school.email || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cls-muted)]">Address</dt>
            <dd className="mt-0.5 truncate font-medium text-[var(--cls-ink)]">
              {school.address || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--cls-muted)]">Website</dt>
            <dd className="mt-0.5 truncate font-medium text-[var(--cls-ink)]">
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
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
