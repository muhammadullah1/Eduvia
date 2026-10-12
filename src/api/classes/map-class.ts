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
