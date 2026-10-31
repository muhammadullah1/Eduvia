import { DailyTestsPanel } from "@/features/management/examinations"

/** Ops weekly tests use the same API-backed daily tests desk as teachers. */
export function WeeklyTestsPanel() {
  return <DailyTestsPanel />
}
