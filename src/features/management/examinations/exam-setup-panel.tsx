import { CalendarDays, ChevronLeft, ChevronRight, List, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { EXAM_TYPES, type ExamSummary } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { ExamStatusPill } from "./exam-status-pill"
import { examLocks } from "./exam-utils"

type View = "calendar" | "list"

type Props = {
  exams: ExamSummary[]
  canManage: boolean
  onSchedule: () => void
  onEdit: (exam: ExamSummary) => void
  onDelete: (exam: ExamSummary) => void
  onArchive: (exam: ExamSummary) => void
  onOpen: (exam: ExamSummary) => void
}


function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "Dates not set"
  const pretty = (value: string) => {
    const [year, month, day] = value.split("-")
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }
  if (start && end && start !== end) return `${pretty(start)} – ${pretty(end)}`
  return pretty(start || end || "")
}

function progress(exam: ExamSummary) {
  const entered = exam.sheets.reduce((sum, sheet) => sum + sheet.entered, 0)
  const students = exam.sheets.reduce((sum, sheet) => sum + sheet.students, 0)
  return { entered, students, ratio: students === 0 ? 0 : entered / students }
}

export function ExamSetupPanel({
  exams,
  canManage,
  onSchedule,
  onEdit,
  onDelete,
  onArchive,
  onOpen,
}: Props) {
  const [view, setView] = useState<View>("list")
  const [query, setQuery] = useState("")
  const [type, setType] = useState<string>("All")

  const filtered = exams.filter((exam) => {
    const matchesType = type === "All" || exam.examType === type
    const matchesQuery = exam.name.toLowerCase().includes(query.trim().toLowerCase())
    return matchesType && matchesQuery
  })

  const stats = [
    { label: "This session", value: exams.length },
    { label: "Scheduled", value: exams.filter((exam) => exam.status === "Scheduled").length },
    {
      label: "Marks pending",
      value: exams.filter((exam) => exam.status === "Marks Pending").length,
    },
    { label: "Published", value: exams.filter((exam) => exam.status === "Published").length },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-[var(--cls-border)] bg-white px-4 py-3.5 shadow-sm"
          >
            <p className="text-xs font-medium text-[var(--cls-muted)]">{stat.label}</p>
            <p className="mt-1 text-[28px] leading-none font-semibold tracking-tight text-[var(--cls-ink)]">
              {stat.value}
            </p>
          </article>
        ))}
      </div>

      {exams.length > 0 ? (
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["All", ...EXAM_TYPES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm",
                type === item
                  ? "bg-[var(--secondary-color)] font-semibold text-[var(--primary-color)] shadow-sm"
                  : "text-[var(--cls-muted)] hover:text-[var(--cls-ink)]"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exams"
              className="h-10 w-full bg-white pl-9 sm:w-56"
            />
          </div>
          <div className="inline-flex rounded-xl border border-[var(--cls-border)] bg-white p-1">
            <button
              type="button"
              aria-label="Calendar"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-lg",
                view === "calendar"
                  ? "bg-[var(--page-wash)] text-[var(--cls-ink)]"
                  : "text-[var(--cls-muted)]"
              )}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-lg",
                view === "list"
                  ? "bg-[var(--page-wash)] text-[var(--cls-ink)]"
                  : "text-[var(--cls-muted)]"
              )}
              onClick={() => setView("list")}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>
      ) : null}

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-semibold text-[var(--cls-ink)]">No examinations this session</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--cls-muted)]">
            Schedule an exam for the classes that should sit it. Each class receives a mark sheet for every offered subject.
          </p>
          {canManage ? (
            <Button className="mt-5" onClick={onSchedule}>
              Schedule exam
            </Button>
          ) : null}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--cls-border)] bg-white px-6 py-14 text-center text-sm text-[var(--cls-muted)] shadow-sm">
          No exams match this search.
        </div>
      ) : view === "calendar" ? (
        <ExamCalendar
          exams={filtered}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onOpen={onOpen}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[var(--page-wash)] text-[11px] tracking-wide text-[var(--cls-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Exam</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Classes</th>
                  <th className="px-4 py-3 font-medium">Marks</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exam) => {
                  const marks = progress(exam)
                  return (
                    <tr key={exam.id} className="border-t border-[var(--cls-border)] hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          className="text-left font-medium text-[#0F172A] hover:text-[#0F766E]"
                          onClick={() => onOpen(exam)}
                        >
                          {exam.name}
                        </button>
                        <div className="text-xs text-[#64748B]">
                          {exam.examType} · {exam.sheets.length} paper{exam.sheets.length === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-[var(--cls-ink)]">
                        {formatRange(exam.startDate, exam.endDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {exam.classes.slice(0, 3).map((klass) => (
                            <span
                              key={klass.id}
                              className="rounded-full bg-[var(--page-wash)] px-2 py-0.5 text-xs text-[var(--cls-ink)]"
                            >
                              {klass.label}
                            </span>
                          ))}
                          {exam.classes.length > 3 ? (
                            <span className="text-xs text-[var(--cls-muted)]">
                              +{exam.classes.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="w-28">
                          <div className="mb-1 text-xs text-[var(--cls-muted)]">
                            {marks.entered}/{marks.students}
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--page-wash)]">
                            <div
                              className="h-full rounded-full bg-[var(--primary-color)]"
                              style={{ width: `${Math.round(marks.ratio * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <ExamStatusPill status={exam.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <ExamRowActions
                          exam={exam}
                          canManage={canManage}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onArchive={onArchive}
                          onOpen={onOpen}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ExamRowActions({
  exam,
  canManage,
  onEdit,
  onDelete,
  onArchive,
  onOpen,
}: {
  exam: ExamSummary
  canManage: boolean
  onEdit: (exam: ExamSummary) => void
  onDelete: (exam: ExamSummary) => void
  onArchive: (exam: ExamSummary) => void
  onOpen: (exam: ExamSummary) => void
}) {
  const locks = examLocks(exam)
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => onOpen(exam)}>
        Open
      </Button>
      {canManage && locks.canEdit ? (
        <Button variant="ghost" size="sm" className="text-[#0F766E]" onClick={() => onEdit(exam)}>
          Edit
        </Button>
      ) : null}
      {canManage && locks.canDelete ? (
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(exam)}>
          Delete
        </Button>
      ) : null}
      {canManage && locks.canArchive ? (
        <Button variant="ghost" size="sm" className="text-[#64748B]" onClick={() => onArchive(exam)}>
          Archive
        </Button>
      ) : null}
    </div>
  )
}

function ExamCalendar({
  exams,
  canManage,
  onEdit,
  onDelete,
  onArchive,
  onOpen,
}: {
  exams: ExamSummary[]
  canManage: boolean
  onEdit: (exam: ExamSummary) => void
  onDelete: (exam: ExamSummary) => void
  onArchive: (exam: ExamSummary) => void
  onOpen: (exam: ExamSummary) => void
}) {
  const initial = useMemo(() => {
    const dated = exams.find((exam) => exam.startDate)
    if (!dated?.startDate) return new Date()
    const [year, month] = dated.startDate.split("-")
    return new Date(Number(year), Number(month) - 1, 1)
  }, [exams])
  const [cursor, setCursor] = useState(initial)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startPad = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ]
  const [picked, setPicked] = useState<ExamSummary | null>(null)
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  function examsOn(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return exams.filter(
      (exam) => exam.startDate && exam.endDate && iso >= exam.startDate && iso <= exam.endDate
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm md:p-5">
      <Dialog open={picked != null} onOpenChange={(open) => !open && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{picked?.name}</DialogTitle>
            <DialogDescription>
              {picked ? `${picked.examType} · ${formatRange(picked.startDate, picked.endDate)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {picked ? (
            <ExamRowActions
              exam={picked}
              canManage={canManage}
              onEdit={(exam) => {
                setPicked(null)
                onEdit(exam)
              }}
              onDelete={(exam) => {
                setPicked(null)
                onDelete(exam)
              }}
              onArchive={(exam) => {
                setPicked(null)
                onArchive(exam)
              }}
              onOpen={(exam) => {
                setPicked(null)
                onOpen(exam)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--cls-ink)]">
          {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--cls-muted)] hover:bg-[var(--page-wash)]"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--cls-muted)] hover:bg-[var(--page-wash)]"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-[11px] tracking-wide text-[var(--cls-muted)] uppercase">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="px-2 py-2">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-l border-[var(--cls-border)]">
        {cells.map((day, index) => {
          const iso = day
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : ""
          const dayExams = day ? examsOn(day) : []
          const isToday = iso === todayIso
          return (
            <div
              key={`${day ?? "pad"}-${index}`}
              className="min-h-[92px] border-r border-b border-[var(--cls-border)] bg-white p-2"
            >
              {day ? (
                <>
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-[var(--cls-ink)] font-semibold text-white"
                        : "text-[var(--cls-muted)]"
                    )}
                  >
                    {day}
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayExams.slice(0, 2).map((exam) => (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => setPicked(exam)}
                        className="truncate rounded-md bg-[var(--secondary-color)] px-1.5 py-0.5 text-left text-[11px] font-medium text-[var(--primary-color)]"
                      >
                        {exam.name}
                      </button>
                    ))}
                    {dayExams.length > 2 ? (
                      <span className="text-[11px] text-[var(--cls-muted)]">
                        +{dayExams.length - 2}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
