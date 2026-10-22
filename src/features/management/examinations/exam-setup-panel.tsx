import { CalendarDays, ChevronLeft, ChevronRight, List, MoreVertical, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { EXAM_TYPES, type ExamSummary } from "@/api/exams/exams.service"
import {
  ClsEmpty,
  clsHeadRowClass,
  ClsPanel,
  clsRowClass,
  ClsStatCard,
  ClsTh,
} from "@/components/app/cls-panel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { getToday } from "@/lib/dates"
import { cn } from "@/lib/utils"

import { ExamLifecycleActions } from "./exam-actions"
import { ExamStatusPill } from "./exam-status-pill"
import { type ExamAction, examLocks } from "./exam-utils"

type View = "calendar" | "list"

type ExamActions = {
  onEdit: (exam: ExamSummary) => void
  onDelete: (exam: ExamSummary) => void
  onArchive: (exam: ExamSummary) => void
  onOpen: (exam: ExamSummary) => void
}

type Props = ExamActions & {
  exams: ExamSummary[]
  canManage: boolean
  onSchedule: () => void
}

function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "Dates not set"
  const pretty = (value: string) => {
    const [year, month, day] = value.split("-")
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }
  if (start && end && start !== end) return `${pretty(start)} – ${pretty(end)}`
  return pretty(start || end || "")
}

function progress(exam: ExamSummary) {
  const entered = exam.sheets.reduce((sum, sheet) => sum + sheet.entered, 0)
  const students = exam.sheets.reduce((sum, sheet) => sum + sheet.students, 0)
  return { entered, students, ratio: students === 0 ? 0 : entered / students }
}

export function ExamSetupPanel({ exams, canManage, onSchedule, ...actions }: Props) {
  const [view, setView] = useState<View>("list")
  const [query, setQuery] = useState("")
  const [type, setType] = useState<string>("all")

  const countFor = (value: string) =>
    value === "all" ? exams.length : exams.filter((exam) => exam.examType === value).length
  const filtered = exams.filter((exam) => {
    const matchesType = type === "all" || exam.examType === type
    return matchesType && exam.name.toLowerCase().includes(query.trim().toLowerCase())
  })
  const count = (status: string) => exams.filter((exam) => exam.status === status).length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ClsStatCard label="Total exams" value={exams.length} hint="This session" />
        <ClsStatCard label="Scheduled" value={count("Scheduled")} hint="Not started" accent="brand" />
        <ClsStatCard label="Marks pending" value={count("Marks Pending")} hint="Sheets in progress" accent="warning" />
        <ClsStatCard label="Published" value={count("Published")} hint="Visible to parents" accent="success" />
      </div>

      <ClsPanel>
        <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--cls-muted)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exams…"
              aria-label="Search exams"
              className="border-[var(--cls-border)] bg-[var(--page-wash)] pl-9"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger
                className="h-10 w-full border-[var(--cls-border)] bg-white sm:w-[200px]"
                aria-label="Exam type"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["all", ...EXAM_TYPES].map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All types" : item} ({countFor(item)})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {exams.length === 0 ? (
          <ClsEmpty title="No examinations this session">
            Schedule an exam for the classes that should sit it. Each class gets a paper for every subject.
            {canManage ? (
              <div className="mt-4">
                <Button onClick={onSchedule}>Schedule exam</Button>
              </div>
            ) : null}
          </ClsEmpty>
        ) : filtered.length === 0 ? (
          <ClsEmpty title="No exams match your filters">Try another type or clear your search.</ClsEmpty>
        ) : view === "calendar" ? (
          <ExamCalendar exams={filtered} canManage={canManage} {...actions} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={clsHeadRowClass}>
                <ClsTh>Exam</ClsTh>
                <ClsTh>Dates</ClsTh>
                <ClsTh>Classes</ClsTh>
                <ClsTh>Marks entered</ClsTh>
                <ClsTh>Status</ClsTh>
                <ClsTh className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exam) => {
                const marks = progress(exam)
                return (
                  <TableRow key={exam.id} className={cn("cursor-pointer", clsRowClass)} onClick={() => actions.onOpen(exam)}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-[var(--cls-ink)]">{exam.name}</span>
                        <span className="text-xs text-[var(--cls-muted)]">
                          {exam.examType} · {exam.sheets.length} paper{exam.sheets.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-[var(--cls-ink)]">
                      {formatRange(exam.startDate, exam.endDate)}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--cls-ink)]">
                      {exam.classes.slice(0, 3).map((klass) => klass.label).join(", ")}
                      {exam.classes.length > 3 ? (
                        <span className="text-xs text-[var(--cls-muted)]"> +{exam.classes.length - 3}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="w-32">
                        <div className="mb-1 text-xs text-[var(--cls-muted)] tabular-nums">
                          {marks.entered}/{marks.students}
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cls-border)]">
                          <div
                            className="h-full rounded-full bg-[var(--cls-brand)]"
                            style={{ width: `${Math.round(marks.ratio * 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ExamStatusPill status={exam.status} />
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <ExamRowMenu exam={exam} canManage={canManage} {...actions} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </ClsPanel>
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: View; onChange: (value: View) => void }) {
  const options = [
    { value: "list" as const, label: "List", Icon: List },
    { value: "calendar" as const, label: "Calendar", Icon: CalendarDays },
  ]
  return (
    <div
      className="inline-flex shrink-0 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] p-1"
      role="group"
      aria-label="Exams view"
    >
      {options.map(({ value: option, label, Icon }) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
            value === option
              ? "bg-white text-[var(--cls-ink)] shadow-sm"
              : "text-[var(--cls-muted)] hover:text-[var(--cls-ink)]"
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

function ExamRowMenu({ exam, canManage, onOpen, onEdit, onDelete, onArchive }: ExamActions & { exam: ExamSummary; canManage: boolean }) {
  const locks = examLocks(exam)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-[var(--cls-muted)]" aria-label={`Actions for ${exam.name}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onOpen(exam)}>Open exam</DropdownMenuItem>
          {canManage && exam.status !== "Archived" ? (
            <MenuAction label={locks.edit.limited ? "Edit (limited)" : "Edit"} action={locks.edit} onSelect={() => onEdit(exam)} />
          ) : null}
          {canManage && locks.archive.allowed ? (
            <DropdownMenuItem onClick={() => onArchive(exam)}>Archive</DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {canManage && exam.status !== "Archived" ? (
          <>
            <DropdownMenuSeparator />
            <MenuAction label="Delete" destructive action={locks.delete} onSelect={() => onDelete(exam)} />
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A menu item that, when unavailable, stays visible and says why. */
function MenuAction({
  label,
  action,
  destructive,
  onSelect,
}: {
  label: string
  action: ExamAction
  destructive?: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
      variant={destructive ? "destructive" : "default"}
      disabled={!action.allowed}
      onClick={onSelect}
      className="flex-col items-start gap-0.5"
    >
      {label}
      {action.reason && !action.allowed ? (
        <span className="text-xs leading-4 font-normal text-[var(--cls-muted)]">{action.reason}</span>
      ) : null}
    </DropdownMenuItem>
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
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => onOpen(exam)}>
        Open
      </Button>
      {canManage ? (
        <ExamLifecycleActions
          exam={exam}
          size="sm"
          onEdit={() => onEdit(exam)}
          onDelete={() => onDelete(exam)}
          onArchive={() => onArchive(exam)}
        />
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
  const todayIso = getToday()

  function examsOn(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return exams.filter(
      (exam) => exam.startDate && exam.endDate && iso >= exam.startDate && iso <= exam.endDate
    )
  }

  return (
    <div className="p-4 md:p-5">
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
