import { toast } from "sonner"

import { downloadText, formatPercent, letterGrade } from "@/lib/format"
import { publishedResults } from "@/lib/selectors"
import type { SchoolState } from "@/types"

export function downloadChildDmc(state: SchoolState, childId: string) {
  const child = state.students.find((student) => student.id === childId)
  if (!child) return false
  const results = publishedResults(state, child)
  if (results.length === 0) {
    toast.error("No published results for this child yet.")
    return false
  }
  const body = results
    .map((result) => {
      const lines = result.rows.map(
        (row) =>
          `${row.subject}: ${row.score} / ${row.max} (${letterGrade(row.percent)})`
      )
      return `${result.exam} · ${result.className}\nOverall ${formatPercent(result.overall)} · Rank ${result.rank} of ${result.cohort}\n${lines.join("\n")}`
    })
    .join("\n\n")
  downloadText(
    `${child.name.replaceAll(" ", "-")}-dmc.txt`,
    `Creative Leaders School\nDetailed marks certificate\n${child.name} · ${child.id} · ${child.className}\n\n${body}`
  )
  toast.success("DMC downloaded.")
  return true
}
