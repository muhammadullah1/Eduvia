import { useState } from "react"

import type { RoleSummary, RoleUser } from "@/api/roles/roles.service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { type Role, ROLE_LABELS } from "@/lib/auth"
import { toast } from "@/lib/toast"
import { useAuthStore } from "@/stores/auth-store"

import { ReasonField } from "./reason-field"
import { isReasonValid } from "./reason-rules"
import { useChangeUserRole, useRoleUsers } from "./use-roles"

/** Roles that share the staff portal; a user can be moved between these. */
const STAFF_ROLES: readonly Role[] = ["super_admin", "operations_manager", "accountant"]

export function RoleUsersSheet({ role, onClose }: { role: RoleSummary | null; onClose: () => void }) {
  const users = useRoleUsers(role?.id)
  const [moving, setMoving] = useState<RoleUser | null>(null)

  return (
    <Sheet open={role !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{role?.label} users</SheetTitle>
          <SheetDescription>
            Everyone in this role. Move a user to another staff role with a reason.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
          {users.isPending && <Skeleton className="h-16 rounded-lg" />}
          {users.isError && <p className="text-sm text-destructive">{users.error.message}</p>}
          {users.data?.length === 0 && (
            <p className="text-sm text-[var(--cls-muted)]">No users have this role yet.</p>
          )}
          {users.data?.map((user) => (
            <UserRow key={user.id} user={user} onChangeRole={() => setMoving(user)} />
          ))}
        </div>
      </SheetContent>
      <ChangeRoleDialog user={moving} onClose={() => setMoving(null)} />
    </Sheet>
  )
}

function UserRow({ user, onChangeRole }: { user: RoleUser; onChangeRole: () => void }) {
  const selfId = useAuthStore((state) => state.user?.id)
  const isSelf = selfId === user.id
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cls-border)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--cls-ink)]">{user.name}</p>
        <p className="truncate text-xs text-[var(--cls-muted)]">{user.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {user.status !== "active" && <Badge variant="outline">{user.status}</Badge>}
        {isSelf && <Badge variant="secondary">You</Badge>}
        {!isSelf && (
          <Button type="button" size="sm" variant="outline" onClick={onChangeRole}>
            Change role
          </Button>
        )}
      </div>
    </div>
  )
}

function ChangeRoleDialog({ user, onClose }: { user: RoleUser | null; onClose: () => void }) {
  const change = useChangeUserRole()
  const [target, setTarget] = useState<Role | "">("")
  const [reason, setReason] = useState("")
  const options = STAFF_ROLES.filter((role) => role !== user?.role)
  const ready = target !== "" && isReasonValid(reason) && !change.isPending

  function close() {
    setTarget("")
    setReason("")
    onClose()
  }

  async function submit() {
    if (!user || target === "") return
    try {
      await change.mutateAsync({ userId: user.id, role: target, reason: reason.trim() })
      toast.success(`${user.name} is now ${ROLE_LABELS[target]}.`)
      close()
    } catch (error) {
      if (error instanceof Error) toast.error(error.message)
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {user?.name}</DialogTitle>
          <DialogDescription>
            Their access changes on their next request. This is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="new-role">New role</Label>
            <Select
              value={target}
              onValueChange={(value) => setTarget(STAFF_ROLES.find((role) => role === value) ?? "")}
            >
              <SelectTrigger id="new-role" className="w-full">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {options.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReasonField id="change-role-reason" value={reason} onChange={setReason} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>
            Change role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
