import type { BulkPromoteRequest, PromotionAction } from "@/api/students/promotions.service"
import type { AcademicSession, ClassSection } from "@/data/types"

/** The session students are usually promoted into: the next one after the current, else the current. */
export function defaultTargetSession(sessions: AcademicSession[]): AcademicSession | undefined {
  const sorted = [...sessions].sort((a, b) => a.start.localeCompare(b.start))
  const index = sorted.findIndex((session) => session.current)
  if (index === -1) return sorted.at(-1)
  return sorted[index + 1] ?? sorted[index]
}

const gradeRank = (grade: string) => {
  const g = grade.trim().toLowerCase()
  const early = ["playgroup", "nursery", "kg", "prep"]
  const at = early.indexOf(g)
  if (at !== -1) return at
  const number = Number(g.match(/\d+/)?.[0])
  return Number.isFinite(number) ? early.length + number : Number.POSITIVE_INFINITY
}

/**
 * Suggest the class one grade above the source in the target session, keeping
 * the section when it exists. Returns undefined at the top grade (graduation).
 */
export function suggestTargetClass(
  source: ClassSection | undefined,
  targetClasses: ClassSection[]
): ClassSection | undefined {
  if (!source) return undefined
  const rank = gradeRank(source.grade)
  const higher = targetClasses
    .filter((klass) => gradeRank(klass.grade) > rank && klass.id !== source.id)
    .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade))
  if (!higher.length) return undefined
  const nextRank = gradeRank(higher[0].grade)
  const sameRank = higher.filter((klass) => gradeRank(klass.grade) === nextRank)
  return sameRank.find((klass) => klass.section === source.section) ?? sameRank[0]
}

/** Where held-back students sit in the target session (same grade and section). */
export function suggestRepeatClass(
  source: ClassSection | undefined,
  targetClasses: ClassSection[]
): ClassSection | undefined {
  if (!source) return undefined
  return (
    targetClasses.find((klass) => klass.id === source.id) ??
    targetClasses.find((klass) => klass.grade === source.grade && klass.section === source.section) ??
    targetClasses.find((klass) => klass.grade === source.grade)
  )
}

export type PlanCounts = Record<PromotionAction, number>

export function countPlan(selected: Iterable<number>, actions: Map<number, PromotionAction>): PlanCounts {
  const counts: PlanCounts = { promote: 0, hold: 0, graduate: 0 }
  for (const id of selected) counts[actions.get(id) ?? "promote"] += 1
  return counts
}

export type PlanInput = {
  sourceClassId?: string
  targetClassId?: string
  holdClassId?: string
  targetSessionId?: string
  date: string
  graduationResult: string
  selected: number[]
  actions: Map<number, PromotionAction>
}

/** Validation messages keyed by field; empty when the plan can be sent. */
export function validatePlan(input: PlanInput, sameSession: boolean): Record<string, string> {
  const errors: Record<string, string> = {}
  const counts = countPlan(input.selected, input.actions)
  if (!input.sourceClassId) errors.sourceClass = "Choose the class to promote from."
  if (!input.targetSessionId) errors.targetSession = "Choose the session students move into."
  if (counts.promote && !input.targetClassId) errors.targetClass = "Choose the class students are promoted to."
  if (counts.promote && input.targetClassId && input.targetClassId === input.sourceClassId) {
    errors.targetClass = "Pick a different class from the source."
  }
  if (counts.hold && !sameSession && !input.holdClassId) {
    errors.holdClass = "Choose where held-back students repeat in the new session."
  }
  if (!input.selected.length) errors.students = "Select at least one student."
  if (!input.date) errors.date = "Choose the date the change takes effect."
  if (counts.graduate && !input.graduationResult.trim()) {
    errors.graduationResult = "Enter the final result for graduating students."
  }
  return errors
}

export function buildPromoteRequest(input: PlanInput, sameSession: boolean): BulkPromoteRequest {
  const counts = countPlan(input.selected, input.actions)
  return {
    fromClassId: Number(input.sourceClassId),
    toClassId: counts.promote ? Number(input.targetClassId) : null,
    holdClassId: counts.hold && !sameSession && input.holdClassId ? Number(input.holdClassId) : null,
    sessionId: Number(input.targetSessionId),
    date: input.date,
    graduationResult: counts.graduate ? input.graduationResult.trim() : undefined,
    students: input.selected.map((studentId) => ({
      studentId,
      action: input.actions.get(studentId) ?? "promote",
    })),
  }
}
