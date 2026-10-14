import { ArrowRight, Mail, Phone } from "lucide-react"
import { Link } from "react-router-dom"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import { Button } from "@/components/ui/button"
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

  const contactFields = [
    { label: "Work email", value: staff.email },
    { label: "Phone", value: staff.phone },
    { label: "User ID", value: staff.id },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <StaffDetailSection
        title="Contact"
        description="Reach this user for operational or finance questions."
      >
        <StaffDetailFields items={contactFields} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={`mailto:${staff.email}`}>
              <Mail data-icon="inline-start" />
              Send email
            </a>
          </Button>
          {staff.phone && staff.phone !== "—" ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={`tel:${staff.phone}`}>
                <Phone data-icon="inline-start" />
                Call
              </a>
            </Button>
          ) : null}
        </div>
      </StaffDetailSection>

      <StaffDetailSection
        title="Role in the portal"
        description={roleDescription(staff.role)}
      >
        <p className="text-sm leading-relaxed text-[var(--cls-muted)]">
          This account is scoped to school operations. Permissions are enforced
          by the API; the areas below reflect what this role can access when
          signed in.
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
