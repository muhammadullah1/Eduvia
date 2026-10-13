import type { AcademicSession } from "@/data/types"
import { getToday } from "@/lib/dates"

export type SessionUiStatus = "current" | "upcoming" | "past"

export function resolveSessionStatus(
  session: AcademicSession,
  today = getToday()
): SessionUiStatus {
  if (session.current) return "current"
  if (session.end && session.end < today) return "past"
  if (session.start && session.start > today) return "upcoming"
  if (session.end && session.end >= today) return "upcoming"
  return "past"
}

export type SessionRow = AcademicSession & {
  uiStatus: SessionUiStatus
}

export function toSessionRows(sessions: AcademicSession[]): SessionRow[] {
  return sessions.map((session) => ({
    ...session,
    uiStatus: resolveSessionStatus(session),
  }))
}
