type StatCard = { label: string; value: string }

type Props = {
  studentCount: number
  subjectCount: number
}

export function ClassDetailOverviewTab({ studentCount, subjectCount }: Props) {
  const stats: StatCard[] = [
    { label: "Enrolled Students", value: String(studentCount) },
    { label: "Subjects Assigned", value: String(subjectCount) },
    {
      label: "Attendance Today",
      value: studentCount > 0 ? "—" : "—",
    },
    {
      label: "Last Exam Pass Rate",
      value: studentCount > 0 ? "—" : "—",
    },
  ]

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-[var(--cls-border)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
        >
          <p className="text-[10.5px] text-[var(--cls-muted)]">{stat.label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--cls-ink)]">
            {stat.value}
          </p>
          {(stat.label === "Attendance Today" ||
            stat.label === "Last Exam Pass Rate") &&
          stat.value === "—" ? (
            <p className="mt-1 text-xs text-[var(--cls-muted)]">
              Available when attendance and exams are connected.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
