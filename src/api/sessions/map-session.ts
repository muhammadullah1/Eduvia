import type { SessionDto } from "@/api/sessions/sessions.service"
import type { AcademicSession } from "@/data/types"

function isoDate(value: string | undefined) {
  if (!value) return ""
  return value.slice(0, 10)
}

export function mapSessionDto(dto: SessionDto): AcademicSession {
  return {
    id: String(dto.id),
    name: dto.name,
    start: isoDate(dto.startDate),
    end: isoDate(dto.endDate),
    current: Boolean(dto.isCurrent),
  }
}
