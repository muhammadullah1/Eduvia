import { ArrowRight, Users } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import type { RoleSummary } from "@/api/roles/roles.service"
import { EmptyState } from "@/components/app/kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"

import { RoleUsersSheet } from "./role-users-sheet"
import { usePermissionCatalog, useRoles } from "./use-roles"

const SKELETON_CARDS = 3

export function RolesList() {
  const roles = useRoles()
  const catalog = usePermissionCatalog()
  const [usersOf, setUsersOf] = useState<RoleSummary | null>(null)
  const total = catalog.data?.permissions.length ?? 0

  if (roles.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <Skeleton key={index} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }
  if (roles.isError) {
    return (
      <EmptyState
        title="Roles could not be loaded"
        detail={roles.error.message}
        action={
          <Button type="button" onClick={() => void roles.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.data.map((role) => (
          <li key={role.id}>
            <RoleCard role={role} total={total} onViewUsers={() => setUsersOf(role)} />
          </li>
        ))}
      </ul>
      <RoleUsersSheet role={usersOf} onClose={() => setUsersOf(null)} />
    </>
  )
}

function RoleCard({
  role,
  total,
  onViewUsers,
}: {
  role: RoleSummary
  total: number
  onViewUsers: () => void
}) {
  const navigate = useNavigate()
  const actor = useActor()
  const fullAccess = role.key === "super_admin"
  const staffPortal = role.portal === "admin"

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{role.label}</CardTitle>
          {fullAccess && <Badge variant="secondary">Full access</Badge>}
          {role.isSystem && <Badge variant="outline">System role</Badge>}
        </div>
        <CardDescription>{role.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="font-semibold text-[var(--cls-ink)]">{role.permissionCount}</span>
          <span className="text-[var(--cls-muted)]"> of {total} permissions</span>
        </p>
        <p>
          <span className="font-semibold text-[var(--cls-ink)]">{role.userCount}</span>
          <span className="text-[var(--cls-muted)]"> active users</span>
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap gap-2">
        <Button type="button" onClick={() => navigate(portalPath(actor.role, "roles", role.key))}>
          {fullAccess && "View permissions"}
          {!fullAccess && "Edit permissions"}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
        {staffPortal && (
          <Button type="button" variant="outline" onClick={onViewUsers}>
            <Users data-icon="inline-start" aria-hidden />
            Users
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
