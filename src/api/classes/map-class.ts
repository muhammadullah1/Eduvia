import type { ClassDto } from "@/api/classes/classes.service"
import type { ClassSection } from "@/data/types"

export function mapClassDto(dto: ClassDto): ClassSection {
  const monthlyFee = Number(dto.monthlyTuitionFee ?? dto.monthlyFee) || 0
  return {
    id: String(dto.id),
    label: dto.label || `${dto.grade} · ${dto.section}`,
    grade: dto.grade,
    section: dto.section,
    room: dto.room || "Unassigned",
    periodCount: Number(dto.periodCount) || 8,
    monthlyFee,
    status: dto.status === "Archived" ? "Archived" : "Active",
    periodStartTimes: dto.periodStartTimes ?? undefined,
    studentCount: dto.studentCount,
    subjectCount: dto.subjectCount,
  }
}

/** Figma list shows a single class title (e.g. Nursery, Class 1). */
export function classDisplayName(klass: ClassSection) {
  const main =
    klass.section === "Main" ||
    klass.section === "-" ||
    klass.section === "General"
  if (main) return klass.grade
  if (klass.label.includes("·")) return klass.label
  return `${klass.grade} · ${klass.section}`
}

export function buildClassLabel(grade: string, section: string) {
  const g = grade.trim()
  const s = section.trim()
  if (!s || s === "Main" || s === "General") return g
  return `${g} · ${s}`
}

export function normalizeClassLabel(label: string) {
  return label.trim().toLowerCase()
}

export function isDuplicateClassLabel(
  existing: { id: string; label: string }[],
  label: string,
  excludeId?: string
) {
  const norm = normalizeClassLabel(label)
  if (!norm) return false
  return existing.some(
    (row) =>
      row.id !== excludeId && normalizeClassLabel(row.label) === norm
  )
}

/** Uniqueness in a session is grade + section (section defaults to Main). */
export function isDuplicateClassGradeSection(
  existing: { id: string; grade: string; section: string }[],
  grade: string,
  section: string,
  excludeId?: string
) {
  const g = grade.trim().toLowerCase()
  const s = (section.trim() || "Main").toLowerCase()
  if (!g) return false
  return existing.some((row) => {
    if (row.id === excludeId) return false
    const rowSection = (row.section.trim() || "Main").toLowerCase()
    return row.grade.trim().toLowerCase() === g && rowSection === s
  })
}
