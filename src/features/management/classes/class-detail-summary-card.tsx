import type { ClassSection } from "@/data/types"
import { useActor } from "@/lib/actor"
import { can } from "@/lib/permissions"

type Props = {
  klass: ClassSection
  sessionName?: string
  studentCount: number
  subjectCount: number
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[120px] flex-1 flex-col gap-1.5">
      <p className="text-xs font-medium text-[var(--cls-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--cls-ink)]">{value}</p>
    </div>
  )
}

function sectionLabel(klass: ClassSection) {
  const s = klass.section?.trim()
  if (!s || s === "Main" || s === "-" || s === "General") return null
  return s
}

export function ClassDetailSummaryCard({
  klass,
  sessionName,
  studentCount,
  subjectCount,
}: Props) {
  const section = sectionLabel(klass)
  // Fee amounts are Super Admin + Accountant data; Ops never sees the class fee.
  const showFee = can(useActor().role, "fees.amounts.view")

  return (
    <div className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-start gap-6">
        {section ? <MetaField label="Section" value={section} /> : null}
        <MetaField label="Room" value={klass.room || "—"} />
        <MetaField label="Session" value={sessionName ?? "—"} />
        <MetaField
          label="Periods / day"
          value={String(klass.periodCount)}
        />
        <MetaField
          label="Enrollment"
          value={`${studentCount} student${studentCount === 1 ? "" : "s"}`}
        />
        <MetaField
          label="Subjects"
          value={`${subjectCount} on timetable`}
        />
        {showFee ? (
          <MetaField
            label="Monthly tuition"
            value={
              klass.monthlyFee > 0
                ? `PKR ${klass.monthlyFee.toLocaleString()}`
                : "—"
            }
          />
        ) : null}
      </div>
    </div>
  )
}
