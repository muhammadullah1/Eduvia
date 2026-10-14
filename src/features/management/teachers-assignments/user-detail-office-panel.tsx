import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { portalPath } from "@/lib/auth"
import type { Role } from "@/lib/auth"

import {
  StaffDetailFields,
  StaffDetailSection,
} from "./staff-detail-section"
import { portalAccessForRole } from "./user-portal-access"

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
  const accessItems = portalAccessForRole(staff.role)

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
          Permissions are enforced by the API. The modules below are what this
          role can open when signed in.
        </p>
      </StaffDetailSection>

      <StaffDetailSection
        title="Portal access"
        description="Shortcuts to areas this role is allowed to use."
        className="lg:col-span-2"
      >
        {accessItems.length === 0 ? (
          <p className="text-sm text-[var(--cls-muted)]">
            No additional portal modules are linked for this role.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {accessItems.map((item) => {
              const href = portalPath(viewerRole, item.section)
              return (
                <li key={item.id}>
                  <Link
                    to={href}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/40 px-4 py-3 transition-colors hover:border-[var(--cls-brand)]/30 hover:bg-white"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--cls-ink)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--cls-muted)]">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-0.5 size-4 shrink-0 text-[var(--cls-muted)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </StaffDetailSection>
    </div>
  )
}
