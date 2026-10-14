import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import type { Role } from "@/lib/auth"
import { can } from "@/lib/permissions"

export function canResendStaffInvitation(
  viewerRole: Role,
  staff: StaffDirectoryRow
) {
  if (staff.role === "teacher") {
    return can(viewerRole, "staff.create.teacher")
  }
  return can(viewerRole, "staff.create.any")
}
