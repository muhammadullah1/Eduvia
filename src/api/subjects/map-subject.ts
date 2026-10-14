import type { ApiSubject } from "@/lib/api-types"
import type { Subject } from "@/data/types"

export type SubjectStatus = "Active" | "Inactive"

export type SubjectRow = Subject & {
  status: SubjectStatus
  category?: string
}

export function mapSubjectDto(dto: ApiSubject): SubjectRow {
  const active = dto.isActive !== false
  return {
    id: String(dto.id),
    name: dto.name,
    code: dto.code?.trim().toUpperCase() || "",
    status: active ? "Active" : "Inactive",
    category: dto.category?.trim() || undefined,
  }
}

export function normalizeSubjectCode(code: string) {
  return code.trim().toUpperCase()
}

export function isDuplicateSubjectCode(
  existing: { id: string; code: string }[],
  code: string,
  excludeId?: string
) {
  const norm = normalizeSubjectCode(code)
  if (!norm) return false
  return existing.some(
    (row) =>
      row.id !== excludeId && normalizeSubjectCode(row.code) === norm
  )
}
