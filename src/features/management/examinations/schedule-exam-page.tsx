import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { type ReactNode,useEffect, useMemo, useState } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import examsService, {
  EXAM_TYPES,
  type ExamSummary,
  type ExamType,
  type ScheduleExamBody,
} from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import type { ClassSection } from "@/data/types"
import { getToday } from "@/lib/dates"
import { EXAM_NAME_MAX, EXAM_NAME_MIN, marksInput, paperTotalError } from "@/lib/marks"
import { cn } from "@/lib/utils"

type Props = {
  sessionId: number | undefined
  sessionName: string
  classes: ClassSection[]
  exam: ExamSummary | null
  saving: boolean
  onCancel: () => void
  onSubmit: (body: ScheduleExamBody) => void
}

type PaperDraft = {
  classId: number
  subjectId: number
  subject: string
  totalMarks: string
  passingMarks: string
  paperDate: string
  startTime: string
  endTime: string
}

const TYPE_COPY: Record<ExamType, string> = {
  "Mid-Term": "The main sitting for the term.",
  "Monthly Test": "A shorter check during the month.",
  "Final Term": "The end-of-session examination.",
  "Unit Test": "One unit, one sitting.",
}

export function ScheduleExamPage({
  sessionId,
  sessionName,
  classes,
  exam,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState("")
  const [examType, setExamType] = useState<ExamType>("Mid-Term")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [classIds, setClassIds] = useState<number[]>([])
  const [papers, setPapers] = useState<PaperDraft[]>([])
  const [rememberDefaults, setRememberDefaults] = useState(true)
  const [error, setError] = useState("")
  // Lifecycle (mirrors the API): past exams are read-only; ongoing ones allow a
  // rename, a later end date and new papers dated today or later.
  const locked = exam ? exam.phase === "past" || exam.status === "Archived" : false
  const ongoing = exam?.phase === "ongoing"
  const today = getToday()
  const existingPaper = (classId: number, subjectId: number) =>
    Boolean(exam?.sheets.some((sheet) => sheet.classId === classId && sheet.subjectId === subjectId))
  const existingClass = (classId: number) => Boolean(exam?.classes.some((klass) => klass.id === classId))

  useEffect(() => {
    if (!exam) {
      setName("")
      setExamType("Mid-Term")
      setStartDate("")
      setEndDate("")
      setClassIds([])
      setPapers([])
      return
    }
    setName(exam.name)
    setExamType(
      (EXAM_TYPES as readonly string[]).includes(exam.examType)
        ? (exam.examType as ExamType)
        : "Mid-Term"
    )
    setStartDate(exam.startDate ?? "")
    setEndDate(exam.endDate ?? "")
    setClassIds(exam.classes.map((klass) => klass.id))
  }, [exam])

  const papersQuery = useQuery({
    queryKey: ["exam-papers", [...classIds].sort((a, b) => a - b).join(",")],
    enabled: classIds.length > 0,
    queryFn: () => examsService.classPapers(classIds),
  })

  useEffect(() => {
    const catalog = papersQuery.data
    if (!catalog) return
    setPapers((current) => {
      const next: PaperDraft[] = []
      for (const klass of catalog) {
        for (const subject of klass.subjects) {
          const kept = current.find(
            (paper) => paper.classId === klass.classId && paper.subjectId === subject.id
          )
          if (kept) {
            next.push(kept)
            continue
          }
          const sheet = exam?.sheets.find(
            (item) => item.classId === klass.classId && item.subjectId === subject.id
          )
          next.push({
            classId: klass.classId,
            subjectId: subject.id,
            subject: subject.name,
            // New papers start from the class subject defaults (Classes → Subjects).
            totalMarks: String(sheet ? sheet.totalMarks : subject.totalMarks),
            passingMarks: String(sheet ? sheet.passingMarks : subject.passingMarks),
            paperDate: sheet?.paperDate ?? "",
            startTime: sheet?.startTime?.slice(0, 5) ?? "",
            endTime: sheet?.endTime?.slice(0, 5) ?? "",
          })
        }
      }
      return next
    })
  }, [papersQuery.data, exam])

  const grouped = useMemo(() => {
    const catalog = papersQuery.data ?? []
    return classIds
      .map((classId) => {
        const meta = catalog.find((item) => item.classId === classId)
        const rows = papers.filter((paper) => paper.classId === classId)
        const total = rows.reduce((sum, paper) => sum + (Number(paper.totalMarks) || 0), 0)
        return {
          classId,
          label:
            meta?.label ??
            (() => {
              const match = classes.find((item) => Number(item.id) === classId)
              return match ? classDisplayName(match) : "Class"
            })(),
          subjects: meta?.subjects ?? [],
          rows,
          total,
        }
      })
      .filter((group) => catalog.length === 0 || catalog.some((item) => item.classId === group.classId) || group.rows.length)
  }, [classIds, papers, papersQuery.data, classes])

  function toggleClass(id: number) {
    setClassIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function updatePaper(classId: number, subjectId: number, patch: Partial<PaperDraft>) {
    setPapers((current) =>
      current.map((paper) =>
        paper.classId === classId && paper.subjectId === subjectId ? { ...paper, ...patch } : paper
      )
    )
  }

  function submit() {
    if (!sessionId) {
      setError("The current session is still loading.")
      return
    }
    if (!name.trim()) {
      setError("Give the exam a name.")
      return
    }
    if (name.trim().length < EXAM_NAME_MIN || name.trim().length > EXAM_NAME_MAX) {
      setError(`The exam name must be ${EXAM_NAME_MIN}–${EXAM_NAME_MAX} characters.`)
      return
    }
    if (!startDate || !endDate) {
      setError("Choose a start date and an end date.")
      return
    }
    if (ongoing && exam?.endDate && endDate < exam.endDate) {
      setError("While the exam is in progress the end date can only be extended.")
      return
    }
    if (endDate < startDate) {
      setError("The end date has to be on or after the start date.")
      return
    }
    if (classIds.length === 0) {
      setError("Choose at least one class.")
      return
    }
    if (papersQuery.isLoading) {
      setError("Subject lists are still loading.")
      return
    }
    const missing = (papersQuery.data ?? []).find((klass) => klass.subjects.length === 0)
    if (missing) {
      setError(`${missing.label} has no subjects assigned.`)
      return
    }
    const payload = []
    for (const paper of papers.filter((item) => classIds.includes(item.classId))) {
      const total = Number(paper.totalMarks)
      const passing = Number(paper.passingMarks)
      const label = `${paper.subject}`
      const totalError = paperTotalError(paper.totalMarks)
      if (totalError) {
        setError(`${label}: ${totalError}`)
        return
      }
      if (!Number.isFinite(passing) || passing < 0 || passing > total) {
        setError(`${label} passing marks must be between 0 and ${total}.`)
        return
      }
      if (paper.paperDate && (paper.paperDate < startDate || paper.paperDate > endDate)) {
        setError(`${label} paper date must fall between the exam dates.`)
        return
      }
      if (ongoing && !existingPaper(paper.classId, paper.subjectId) && (!paper.paperDate || paper.paperDate < today)) {
        setError(`${label}: a paper added to an exam in progress needs a date of today or later.`)
        return
      }
      if ((paper.startTime || paper.endTime) && !paper.paperDate) {
        setError(`Choose a date for ${label} before setting its time.`)
        return
      }
      if (paper.startTime && paper.endTime && paper.endTime <= paper.startTime) {
        setError(`${label} must end after it starts.`)
        return
      }
      payload.push({
        classId: paper.classId,
        subjectId: paper.subjectId,
        totalMarks: total,
        passingMarks: passing,
        paperDate: paper.paperDate || null,
        startTime: paper.startTime || null,
        endTime: paper.endTime || null,
      })
    }
    if (payload.length === 0) {
      setError("Enter paper marks for each subject.")
      return
    }
    setError("")
    onSubmit({
      name: name.trim(),
      examType,
      sessionId,
      startDate,
      endDate,
      papers: payload,
      rememberDefaults,
    })
  }

  // Date and time stay optional; the form only warns about missing ones.
  const unscheduled = papers.filter(
    (paper) => classIds.includes(paper.classId) && (!paper.paperDate || !paper.startTime)
  ).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--cls-border)] bg-white text-[var(--cls-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
            aria-label="Back to examinations"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--heading)]">
              {exam ? "Edit exam" : "Schedule exam"}
            </h1>
            <p className="text-sm text-[var(--cls-muted)]">
              Each subject keeps its own paper marks and passing marks.
            </p>
          </div>
        </div>
        <Button onClick={submit} disabled={saving || locked || !sessionId}>
          {saving ? "Saving…" : exam ? "Save exam" : "Create exam"}
        </Button>
      </div>

      <section className="rounded-xl border border-[var(--cls-border)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] md:p-6">
        <h2 className="text-base font-semibold text-[var(--heading)]">Basic information</h2>
        {locked ? (
          <LifecycleNote tone="muted">
            This exam has ended, so it can no longer be edited. Archive it from the exam page instead.
          </LifecycleNote>
        ) : ongoing ? (
          <LifecycleNote tone="amber">
            This exam is in progress. You can rename it, extend the end date and add papers dated today or later.
            The exam type, start date, classes and existing papers are locked.
          </LifecycleNote>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EXAM_TYPES.map((type) => {
            const selected = examType === type
            return (
              <button
                key={type}
                type="button"
                disabled={locked || ongoing}
                onClick={() => setExamType(type)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-[var(--primary-color)] bg-[var(--secondary-color)]"
                    : "border-[var(--cls-border)] bg-white hover:border-[var(--primary-color)]"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--heading)]">
                  <span
                    className={cn(
                      "size-3.5 rounded-full border",
                      selected
                        ? "border-[var(--primary-color)] bg-[var(--primary-color)] shadow-[inset_0_0_0_3px_white]"
                        : "border-[var(--cls-border)]"
                    )}
                    aria-hidden
                  />
                  {type}
                </span>
                <span className="mt-1 block pl-5 text-xs leading-5 text-[var(--cls-muted)]">
                  {TYPE_COPY[type]}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Exam name" required>
            <Input
              value={name}
              placeholder="e.g. Mid-Term Examination 2026"
              maxLength={EXAM_NAME_MAX}
              aria-describedby="exam-name-count"
              disabled={locked}
              onChange={(event) => setName(event.target.value)}
            />
            <p id="exam-name-count" className="mt-1 text-right text-xs text-[var(--cls-muted)]">
              {name.length}/{EXAM_NAME_MAX}
            </p>
          </Field>
          <Field label="Session" required>
            <Input value={sessionName || "Current session"} disabled />
          </Field>
          <Field label="Date from" required>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              defaultMonthKind="today"
              placeholder="Select date"
              disabled={locked || ongoing}
            />
          </Field>
          <Field label="Date to" required>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              fromDate={(ongoing ? exam?.endDate : startDate) || undefined}
              defaultMonthKind="today"
              placeholder="Select date"
              disabled={locked}
            />
          </Field>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <Label>
              Classes <span className="text-[var(--destructive)]">*</span>
            </Label>
            <span className="text-xs text-[var(--cls-muted)]">{classIds.length} selected</span>
          </div>
          {classes.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--cls-muted)]">
              Add a class for this session before scheduling an exam.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {classes.map((klass) => {
                const id = Number(klass.id)
                const selected = classIds.includes(id)
                return (
                  <button
                    key={klass.id}
                    type="button"
                    disabled={locked || (ongoing && existingClass(id))}
                    onClick={() => toggleClass(id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selected
                        ? "border-[var(--primary-color)] bg-[var(--secondary-color)] font-medium text-[var(--primary-color)]"
                        : "border-[var(--cls-border)] bg-white text-[var(--heading)] hover:border-[var(--primary-color)]"
                    )}
                  >
                    {classDisplayName(klass)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {classIds.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--heading)]">Paper marks</h2>
            <p className="text-sm text-[var(--cls-muted)]">
              Marks start from each class’s subject defaults. Set a date and time for each paper inside the exam window.
              The class total is the sum of its papers.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-[var(--cls-ink)]">
              <Checkbox
                checked={rememberDefaults}
                disabled={locked}
                onCheckedChange={(checked) => setRememberDefaults(checked === true)}
              />
              Save these marks as the class defaults for next time
            </label>
          </div>
          {papersQuery.isLoading ? (
            <p className="text-sm text-[var(--cls-muted)]">Loading each class’s subjects…</p>
          ) : papersQuery.isError ? (
            <p className="rounded-xl bg-[var(--error-light)] px-4 py-3 text-sm text-[var(--destructive)]">
              {papersQuery.error instanceof Error
                ? papersQuery.error.message
                : "Could not load subjects for these classes."}
            </p>
          ) : (
            grouped.map((group) => (
              <article
                key={group.classId}
                className="overflow-hidden rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
              >
                <div className="flex flex-col gap-1 border-b border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--heading)]">{group.label}</h3>
                    <p className="text-xs text-[var(--cls-muted)]">
                      {group.subjects.length} subject{group.subjects.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[var(--primary-color)]">
                    Class total {group.total}
                  </p>
                </div>
                {group.subjects.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[var(--cls-muted)]">
                    This class has no subjects assigned yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-[var(--secondary-color)] text-[11px] tracking-wide text-[var(--primary-color)] uppercase">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Subject</th>
                          <th className="px-4 py-2.5 font-medium">Paper marks</th>
                          <th className="px-4 py-2.5 font-medium">Passing marks</th>
                          <th className="px-4 py-2.5 font-medium">Date</th>
                          <th className="px-4 py-2.5 font-medium">Start</th>
                          <th className="px-4 py-2.5 font-medium">End</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((paper) => {
                          const paperLocked = locked || (ongoing && existingPaper(paper.classId, paper.subjectId))
                          return (
                          <tr key={`${paper.classId}-${paper.subjectId}`} className="border-t border-[var(--cls-border)]">
                            <td className="px-4 py-2.5 font-medium text-[var(--heading)]">{paper.subject}</td>
                            <td className="px-4 py-2.5">
                              <Input
                                className="h-9 w-28"
                                inputMode="numeric"
                                maxLength={4}
                                aria-label={`${paper.subject} total marks`}
                                aria-invalid={paperTotalError(paper.totalMarks) ? true : undefined}
                                disabled={paperLocked}
                                value={paper.totalMarks}
                                onChange={(event) =>
                                  updatePaper(paper.classId, paper.subjectId, {
                                    totalMarks: marksInput(event.target.value, { decimals: false }),
                                  })
                                }
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <Input
                                className="h-9 w-28"
                                inputMode="decimal"
                                aria-label={`${paper.subject} passing marks`}
                                disabled={paperLocked}
                                value={paper.passingMarks}
                                onChange={(event) =>
                                  updatePaper(paper.classId, paper.subjectId, {
                                    passingMarks: marksInput(event.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <DatePicker
                                id={`paper-date-${paper.classId}-${paper.subjectId}`}
                                className="h-9 w-40"
                                placeholder="Not set"
                                aria-label={`${paper.subject} paper date`}
                                defaultMonthKind="today"
                                fromDate={(ongoing && startDate < today ? today : startDate) || undefined}
                                maxDate={endDate || undefined}
                                disabled={paperLocked}
                                value={paper.paperDate}
                                onChange={(value) =>
                                  updatePaper(paper.classId, paper.subjectId, { paperDate: value })
                                }
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <TimePicker
                                className="w-32"
                                label="Start time"
                                aria-label={`${paper.subject} start time`}
                                disabled={paperLocked}
                                value={paper.startTime}
                                onChange={(value) =>
                                  updatePaper(paper.classId, paper.subjectId, { startTime: value })
                                }
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <TimePicker
                                className="w-32"
                                label="End time"
                                aria-label={`${paper.subject} end time`}
                                disabled={paperLocked}
                                value={paper.endTime}
                                onChange={(value) =>
                                  updatePaper(paper.classId, paper.subjectId, { endTime: value })
                                }
                              />
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      ) : null}

      {unscheduled > 0 ? (
        <p className="rounded-lg border border-[#fedf89] bg-[#fffaeb] px-3 py-2 text-sm text-[#b54708]" role="status">
          {unscheduled} {unscheduled === 1 ? "paper has" : "papers have"} no date or start time yet. You can save
          now and add them later; the date sheet stays incomplete until you do.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-[var(--error-light)] px-3 py-2 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-[var(--destructive)]"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

function LifecycleNote({ tone, children }: { tone: "muted" | "amber"; children: ReactNode }) {
  return (
    <p
      role="note"
      className={cn(
        "mt-3 rounded-lg border px-3.5 py-2.5 text-sm",
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-[var(--cls-border)] bg-[var(--page-wash)] text-[var(--cls-muted)]"
      )}
    >
      {children}
    </p>
  )
}
