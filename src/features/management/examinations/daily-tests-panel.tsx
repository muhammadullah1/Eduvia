import { useQuery } from "@tanstack/react-query"

import examsService from "@/api/exams/exams.service"

import { ExamStatusPill } from "./exam-status-pill"

export function DailyTestsPanel() {
  const month = new Date().toISOString().slice(0, 7)
  const query = useQuery({
    queryKey: ["daily-tests", month],
    queryFn: () => examsService.dailyTests(month),
  })
  const rows = query.data ?? []

  if (query.isLoading) {
    return <p className="text-sm text-[var(--cls-muted)]">Loading this month’s daily tests…</p>
  }
  if (query.isError) {
    return (
      <p className="text-sm text-red-700">
        {query.error instanceof Error ? query.error.message : "Could not load daily tests."}
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center shadow-sm">
        <p className="font-medium">No daily tests in {month}</p>
        <p className="mt-1 text-sm text-[var(--cls-muted)]">
          Tests appear here after they are generated from the daily test schedule.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[var(--page-wash)] text-[11px] tracking-wide text-[var(--cls-muted)] uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Class</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Entered</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((test) => (
            <tr key={test.id} className="border-b border-[var(--cls-border)] last:border-0">
              <td className="px-4 py-3">{test.date}</td>
              <td className="px-4 py-3">{test.class?.label ?? "—"}</td>
              <td className="px-4 py-3">{test.subject?.name ?? "—"}</td>
              <td className="px-4 py-3">
                {(test.results ?? []).filter((row) => row.obtainedMarks != null).length}
                /{(test.results ?? []).length}
              </td>
              <td className="px-4 py-3">
                <ExamStatusPill status={test.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
