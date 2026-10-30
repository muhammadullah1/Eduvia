import { useState } from "react"

import type { RoleDetail } from "@/api/roles/roles.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PermissionKey } from "@/lib/access"
import { ApiHttpError } from "@/lib/api"
import { toast } from "@/lib/toast"

import type { PermissionDiff } from "./permission-draft"
import { ReasonField } from "./reason-field"
import { isReasonValid } from "./reason-rules"
import { useResetPermissions, useSavePermissions } from "./use-roles"

const HTTP_CONFLICT = 409

const DIFF_TONES = {
  added: { sign: "+", className: "font-semibold text-[var(--cls-brand)]" },
  removed: { sign: "−", className: "font-semibold text-destructive" },
} as const

function reportSaveError(error: unknown) {
  if (error instanceof ApiHttpError && error.status === HTTP_CONFLICT) {
    toast.error("Someone else changed this role. The latest version has been loaded; review and try again.")
    return
  }
  if (error instanceof Error) toast.error(error.message)
}

function DiffList({
  title,
  keys,
  labels,
  tone,
}: {
  title: string
  keys: readonly PermissionKey[]
  labels: ReadonlyMap<PermissionKey, string>
  tone: keyof typeof DIFF_TONES
}) {
  if (keys.length === 0) return null
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-semibold text-[var(--cls-ink)]">
        {title} ({keys.length})
      </h3>
      <ul className="mt-1.5 flex flex-col gap-1 text-sm">
        {keys.map((key) => (
          <li key={key} className="flex items-baseline gap-2">
            <span aria-hidden className={DIFF_TONES[tone].className}>
              {DIFF_TONES[tone].sign}
            </span>
            <span>{labels.get(key) ?? key}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SavePermissionsDialog({
  open,
  role,
  draft,
  diff,
  labels,
  onClose,
}: {
  open: boolean
  role: RoleDetail
  draft: ReadonlySet<PermissionKey>
  diff: PermissionDiff
  labels: ReadonlyMap<PermissionKey, string>
  onClose: () => void
}) {
  const save = useSavePermissions(role.id)
  const [reason, setReason] = useState("")
  const ready = isReasonValid(reason) && !save.isPending

  async function submit() {
    try {
      await save.mutateAsync({ permissions: [...draft], reason: reason.trim(), version: role.version })
      toast.success(`${role.label} permissions updated.`)
      setReason("")
      onClose()
    } catch (error) {
      reportSaveError(error)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review changes to {role.label}</DialogTitle>
          <DialogDescription>
            Everyone with this role gets the new access on their next request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <DiffList title="Granted" keys={diff.added} labels={labels} tone="added" />
          <DiffList title="Removed" keys={diff.removed} labels={labels} tone="removed" />
          <ReasonField id="save-permissions-reason" value={reason} onChange={setReason} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>
            Confirm update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ResetRoleDialog({
  open,
  role,
  onClose,
}: {
  open: boolean
  role: RoleDetail
  onClose: () => void
}) {
  const reset = useResetPermissions(role.id)
  const [reason, setReason] = useState("")
  const ready = isReasonValid(reason) && !reset.isPending

  async function submit() {
    try {
      await reset.mutateAsync({ reason: reason.trim(), version: role.version })
      toast.success(`${role.label} is back to its default permissions.`)
      setReason("")
      onClose()
    } catch (error) {
      reportSaveError(error)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset {role.label} to default?</DialogTitle>
          <DialogDescription>
            Every permission returns to the standard set for this role. Unsaved edits are discarded.
          </DialogDescription>
        </DialogHeader>
        <ReasonField id="reset-role-reason" value={reason} onChange={setReason} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>
            Reset to default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
