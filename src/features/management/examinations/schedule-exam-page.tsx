import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import { classDisplayName } from "@/api/classes/map-class"
import examsService, {
  EXAM_TYPES,
  type ExamSummary,
  type ExamType,
  type ScheduleExamBody,
} from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClassSection } from "@/data/types"
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
  const [error, setError] = useState("")
  const locked = exam?.status === "Published" || exam?.status === "Finalised"

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
            totalMarks: sheet ? String(sheet.totalMarks) : "100",
            passingMarks: sheet ? String(sheet.passingMarks) : "40",
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
    if (!startDate || !endDate) {
      setError("Choose a start date and an end date.")
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
      if (!Number.isFinite(total) || total <= 0) {
        setError(`Enter paper marks for ${label}.`)
        return
      }
      if (!Number.isFinite(passing) || passing < 0 || passing > total) {
        setError(`${label} passing marks must be between 0 and ${total}.`)
        return
      }
      payload.push({
        classId: paper.classId,
        subjectId: paper.subjectId,
        totalMarks: total,
        passingMarks: passing,
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
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--cls-border)] bg-white text-[var(--cls-ink)] shadow-sm"
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

      <section className="rounded-2xl border border-[var(--cls-border)] bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-semibold text-[var(--heading)]">Basic information</h2>
        {locked ? (
          <p className="mt-2 text-sm text-[var(--cls-muted)]">
            This exam is {exam?.status.toLowerCase()}. Its papers stay as they are.
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EXAM_TYPES.map((type) => {
            const selected = examType === type
            return (
              <button
                key={type}
                type="button"
                disabled={locked}
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
              disabled={locked}
              onChange={(event) => setName(event.target.value)}
            />
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
              disabled={locked}
            />
          </Field>
          <Field label="Date to" required>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              fromDate={startDate || undefined}
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
                    disabled={locked}
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
              English can be 100 with a pass mark of 40. Islamiyat can be 50 with a pass mark of 25. The class total is the sum of its papers.
            </p>
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
                className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm"
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
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-[var(--secondary-color)] text-[11px] tracking-wide text-[var(--primary-color)] uppercase">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Subject</th>
                          <th className="px-4 py-2.5 font-medium">Paper marks</th>
                          <th className="px-4 py-2.5 font-medium">Passing marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((paper) => (
                          <tr key={`${paper.classId}-${paper.subjectId}`} className="border-t border-[var(--cls-border)]">
                            <td className="px-4 py-2.5 font-medium text-[var(--heading)]">{paper.subject}</td>
                            <td className="px-4 py-2.5">
                              <Input
                                className="h-9 w-28"
                                inputMode="decimal"
                                disabled={locked}
                                value={paper.totalMarks}
                                onChange={(event) =>
                                  updatePaper(paper.classId, paper.subjectId, {
                                    totalMarks: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <Input
                                className="h-9 w-28"
                                inputMode="decimal"
                                disabled={locked}
                                value={paper.passingMarks}
                                onChange={(event) =>
                                  updatePaper(paper.classId, paper.subjectId, {
                                    passingMarks: event.target.value,
                                  })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
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
