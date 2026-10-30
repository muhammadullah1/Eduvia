import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
import type { Can } from "@/lib/access"

export function canResendStaffInvitation(can: Can, staff: StaffDirectoryRow) {
  if (staff.role === "teacher") {
    return can("users.create")
  }
  return can("roles.manage")
}
