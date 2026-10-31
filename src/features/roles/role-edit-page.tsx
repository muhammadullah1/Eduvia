import { ArrowLeft, Lock, RotateCcw } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import type { PermissionCatalog, RoleDetail } from "@/api/roles/roles.service"
import { EmptyState } from "@/components/app/kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { PermissionKey } from "@/lib/access"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { cn } from "@/lib/utils"

import {
  diffPermissions,
  grantedKeys,
  groupByModule,
  isEditable,
  type ModuleGroup,
  type PermissionRow,
  toggleKey,
  toggleModule,
} from "./permission-draft"
import { ResetRoleDialog, SavePermissionsDialog } from "./role-save-dialogs"
import { usePermissionCatalog, useRoleDetail, useRoles } from "./use-roles"

export function RoleEditPage({ roleKey }: { roleKey: string }) {
  const navigate = useNavigate()
  const actor = useActor()
  const roles = useRoles()
  const summary = roles.data?.find((role) => role.key === roleKey)
  const detail = useRoleDetail(summary?.id)
  const catalog = usePermissionCatalog()
  const backToRoles = () => navigate(portalPath(actor.role, "roles"))

  if (roles.isPending || detail.isPending || catalog.isPending) {
    return <Skeleton className="h-96 rounded-xl" aria-busy="true" />
  }
  if (!summary || !detail.data || !catalog.data) {
    return (
      <EmptyState
        title="Role not found"
        detail="This role does not exist in your school, or it could not be loaded."
        action={
          <Button type="button" onClick={backToRoles}>
            Back to roles
          </Button>
        }
      />
    )
  }
  return (
    <RoleEditor
      key={detail.data.version}
      role={detail.data}
      catalog={catalog.data}
      onBack={backToRoles}
    />
  )
}

function RoleEditor({
  role,
  catalog,
  onBack,
}: {
  role: RoleDetail
  catalog: PermissionCatalog
  onBack: () => void
}) {
  const saved = useMemo(() => grantedKeys(role.permissions), [role.permissions])
  const groups = useMemo(() => groupByModule(catalog, role.permissions), [catalog, role.permissions])
  const labels = useMemo(
    () => new Map(catalog.permissions.map((permission) => [permission.key, permission.label])),
    [catalog.permissions]
  )
  const [draft, setDraft] = useState<ReadonlySet<PermissionKey>>(saved)
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const diff = diffPermissions(saved, draft)
  const changeCount = diff.added.length + diff.removed.length
  const readOnly = role.key === "super_admin"
  const atDefaults = role.permissions.every((state) => state.granted === state.isDefault)

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
        <Button type="button" variant="ghost" className="w-fit px-0" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          All roles
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--heading)]">
              {role.label}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--cls-muted)]">{role.description}</p>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              disabled={atDefaults}
              onClick={() => setResetting(true)}
            >
              <RotateCcw data-icon="inline-start" aria-hidden />
              Reset to default
            </Button>
          )}
        </div>
        {readOnly && (
          <p className="rounded-lg border border-[var(--cls-border)] bg-white px-4 py-3 text-sm text-[var(--cls-muted)]">
            The Super Admin always holds every permission so the school can never be locked out.
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <ModuleCard
            key={group.module.key}
            group={group}
            draft={draft}
            readOnly={readOnly}
            onChange={setDraft}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cls-border)] bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
          <p className="text-sm text-[var(--cls-muted)]" aria-live="polite">
            {changeCount === 0 && "No unsaved changes"}
            {changeCount === 1 && "1 unsaved change"}
            {changeCount > 1 && `${changeCount} unsaved changes`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={changeCount === 0}
              onClick={() => setDraft(saved)}
            >
              Discard
            </Button>
            <Button type="button" disabled={changeCount === 0} onClick={() => setConfirming(true)}>
              Update permissions
            </Button>
          </div>
        </div>
      )}

      <SavePermissionsDialog
        open={confirming}
        role={role}
        draft={draft}
        diff={diff}
        labels={labels}
        onClose={() => setConfirming(false)}
      />
      <ResetRoleDialog open={resetting} role={role} onClose={() => setResetting(false)} />
    </div>
  )
}

function ModuleCard({
  group,
  draft,
  readOnly,
  onChange,
}: {
  group: ModuleGroup
  draft: ReadonlySet<PermissionKey>
  readOnly: boolean
  onChange: (next: ReadonlySet<PermissionKey>) => void
}) {
  const editable = group.rows.filter(isEditable)
  const grantedCount = group.rows.filter((row) => draft.has(row.key)).length
  const allEditableOn = editable.length > 0 && editable.every((row) => draft.has(row.key))
  const switchId = `module-${group.module.key}`

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              <label htmlFor={switchId}>{group.module.label}</label>
            </CardTitle>
            {group.module.sensitive && <Badge variant="destructive">Sensitive</Badge>}
          </div>
          <CardDescription className="mt-1">
            {group.module.description} {grantedCount} of {group.rows.length} on.
          </CardDescription>
        </div>
        <Switch
          id={switchId}
          checked={allEditableOn}
          disabled={readOnly || editable.length === 0}
          onCheckedChange={(on) => onChange(toggleModule(draft, group.rows, on))}
          aria-label={`All editable ${group.module.label} permissions`}
        />
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2" aria-label={`${group.module.label} permissions`}>
          {group.rows.map((row) => (
            <li key={row.key}>
              <PermissionChip
                row={row}
                on={draft.has(row.key)}
                readOnly={readOnly}
                onToggle={(on) => onChange(toggleKey(draft, row.key, on))}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function PermissionChip({
  row,
  on,
  readOnly,
  onToggle,
}: {
  row: PermissionRow
  on: boolean
  readOnly: boolean
  onToggle: (on: boolean) => void
}) {
  const locked = !isEditable(row)
  const chip = (
    <Toggle
      variant="outline"
      size="sm"
      pressed={on}
      disabled={readOnly || locked}
      onPressedChange={onToggle}
      aria-label={`${row.label}: ${row.description}`}
      className={cn(
        "h-auto min-h-8 max-w-full py-1 text-left whitespace-normal",
        "data-[state=on]:border-[var(--cls-brand)] data-[state=on]:bg-[var(--cls-brand)]/10 data-[state=on]:text-[var(--cls-brand)]"
      )}
    >
      {locked && <Lock data-icon="inline-start" aria-hidden />}
      {row.label}
    </Toggle>
  )
  if (!locked) return chip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-lg">
          {chip}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{row.lockReason}</TooltipContent>
    </Tooltip>
  )
}
