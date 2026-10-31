import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"
import { useCan } from "@/lib/access"
import type { Role } from "@/lib/auth"
import { portalPath } from "@/lib/auth"

import {
  StaffDetailFields,
  StaffDetailSection,
} from "./staff-detail-section"

type Props = {
  staff: StaffDirectoryRow
  viewerRole: Role
}

function roleDescription(role: StaffDirectoryRow["role"]) {
  if (role === "operations_manager") {
    return "Manages day-to-day academic operations, admissions, and teacher setup for the school portal."
  }
  if (role === "accountant") {
    return "Handles fee collection, payment confirmation, and finance visibility for the school."
  }
  return "Portal user for this school."
}

export function UserDetailOfficePanel({ staff, viewerRole }: Props) {
  const can = useCan()
  const canManageRoles = can("roles.manage")

  const roleFields = [
    { label: "Portal role", value: staff.roleLabel },
    { label: "Account status", value: staff.status },
    { label: "User ID", value: staff.id },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <StaffDetailSection
        title="About this role"
        description={roleDescription(staff.role)}
      >
        <StaffDetailFields items={roleFields} />
        <p className="mt-4 text-sm leading-relaxed text-[var(--cls-muted)]">
          Permissions are enforced by the API on every request.
        </p>
      </StaffDetailSection>

      <StaffDetailSection
        title="Portal access"
        description="What this role can open is set on the Roles & Permissions page."
        className="lg:col-span-2"
      >
        {canManageRoles ? (
          <Button asChild>
            <Link to={portalPath(viewerRole, "roles", staff.role)}>
              View {staff.roleLabel} permissions
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-[var(--cls-muted)]">
            Ask your Super Admin to change what this role can access.
          </p>
        )}
      </StaffDetailSection>
    </div>
  )
}
