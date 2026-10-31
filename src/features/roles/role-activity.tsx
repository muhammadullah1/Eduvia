import type { AuditEventView } from "@/api/audit/audit.service"
import { EmptyState } from "@/components/app/kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, timeAgo } from "@/lib/format"

import { usePermissionCatalog, USER_ROLE_ENTITY,useRoleActivity } from "./use-roles"

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function text(value: unknown) {
  if (typeof value === "string") return value
  return ""
}

export function RoleActivity() {
  const activity = useRoleActivity()
  const catalog = usePermissionCatalog()
  const labels = new Map<string, string>(
    (catalog.data?.permissions ?? []).map((permission) => [permission.key, permission.label])
  )

  if (activity.isPending) return <Skeleton className="h-64 rounded-xl" aria-busy="true" />
  if (activity.isError) {
    return (
      <EmptyState
        title="Activity could not be loaded"
        detail={activity.error.message}
        action={
          <Button type="button" onClick={() => void activity.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  if (activity.data.length === 0) {
    return (
      <EmptyState
        title="No role changes yet"
        detail="Permission edits, resets and role changes for users will appear here."
      />
    )
  }
  return (
    <ol className="flex flex-col gap-3" aria-label="Role activity">
      {activity.data.map((event) => (
        <li key={`${event.entity}-${event.id}`}>
          <ActivityItem event={event} labels={labels} />
        </li>
      ))}
    </ol>
  )
}

function ActivityItem({ event, labels }: { event: AuditEventView; labels: ReadonlyMap<string, string> }) {
  const added = stringList(event.metadata.added)
  const removed = stringList(event.metadata.removed)
  const reason = text(event.metadata.reason)
  const isUserChange = event.entity === USER_ROLE_ENTITY
  const label = (key: string) => labels.get(key) ?? key

  return (
    <article className="rounded-xl border border-[var(--cls-border)] bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium text-[var(--cls-ink)]">{event.actor}</span> {event.action}
        </p>
        <time dateTime={event.at} title={formatDate(event.at)} className="text-xs text-[var(--cls-muted)]">
          {timeAgo(event.at)}
        </time>
      </div>
      {isUserChange && (
        <p className="mt-1 text-sm text-[var(--cls-muted)]">
          {text(event.metadata.userEmail)}: {text(event.metadata.fromLabel)} → {text(event.metadata.toLabel)}
        </p>
      )}
      {(added.length > 0 || removed.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {added.map((key) => (
            <Badge key={`+${key}`} variant="secondary">
              + {label(key)}
            </Badge>
          ))}
          {removed.map((key) => (
            <Badge key={`-${key}`} variant="destructive">
              − {label(key)}
            </Badge>
          ))}
        </div>
      )}
      {reason && <p className="mt-2 text-sm text-[var(--cls-ink)]">Reason: {reason}</p>}
    </article>
  )
}
