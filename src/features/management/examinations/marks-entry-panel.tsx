import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import examsService, {
  type ExamSheetSummary,
  type ExamSummary,
  type SheetRow,
} from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ExamStatusPill } from "./exam-status-pill"

type DraftRow = {
  studentId: number
  name: string
  admissionNo: string
  score: string
  absent: boolean
  exempt: boolean
}

type Props = {
  exams: ExamSummary[]
  initialExamId?: number | null
  canManage: boolean
  canEnter: boolean
}

function rowScore(row: SheetRow) {
  const raw = row.score ?? row.obtainedMarks
  if (raw == null || raw === "") return ""
  return String(raw)
}

export function MarksEntryPanel({
  exams,
  initialExamId,
  canManage,
  canEnter,
}: Props) {
  const queryClient = useQueryClient()
  const [examId, setExamId] = useState<string>(initialExamId ? String(initialExamId) : "")
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [draft, setDraft] = useState<DraftRow[]>([])

  useEffect(() => {
    if (initialExamId) setExamId(String(initialExamId))
  }, [initialExamId])

  const exam = exams.find((item) => String(item.id) === examId)
  const classes = exam?.classes ?? []
  const subjects = useMemo(() => {
    if (!exam || !classId) return []
    const seen = new Map<number, ExamSheetSummary>()
    for (const sheet of exam.sheets) {
      if (String(sheet.classId) === classId) seen.set(sheet.subjectId, sheet)
    }
    return [...seen.values()]
  }, [exam, classId])
  const sheet = subjects.find((item) => String(item.subjectId) === subjectId)

  useEffect(() => {
    if (!classId && classes[0]) setClassId(String(classes[0].id))
  }, [classes, classId])

  useEffect(() => {
    if (!subjects.some((item) => String(item.subjectId) === subjectId)) {
      setSubjectId(subjects[0] ? String(subjects[0].subjectId) : "")
    }
  }, [subjects, subjectId])

  const sheetQuery = useQuery({
    queryKey: ["exam-sheet", sheet?.id],
    enabled: Boolean(sheet?.id),
    queryFn: () => examsService.sheet(sheet!.id),
  })

  useEffect(() => {
    const rows = sheetQuery.data?.rows ?? []
    setDraft(
      rows.map((row) => ({
        studentId: row.fkStudentId,
        name: row.student
          ? `${row.student.firstName} ${row.student.lastName}`.trim()
          : `Student ${row.fkStudentId}`,
        admissionNo: row.student?.admissionNo ?? "",
        score: row.isAbsent || row.isExempt ? "" : rowScore(row),
        absent: Boolean(row.isAbsent),
        exempt: Boolean(row.isExempt),
      }))
    )
  }, [sheetQuery.data])

  const editable = canEnter && sheetQuery.data?.status === "Draft"
  const entered = draft.filter(
    (row) => row.absent || row.exempt || row.score.trim() !== ""
  ).length

  const save = useMutation({
    mutationFn: (submit: boolean) => {
      if (!sheet) throw new Error("Choose a subject.")
      const rows = draft.map((row) => {
        const score = row.absent || row.exempt || row.score.trim() === "" ? null : Number(row.score)
        if (score != null && Number.isNaN(score)) {
          throw new Error(`Enter a number for ${row.name}.`)
        }
        return {
          studentId: row.studentId,
          score,
          absent: row.absent,
          exempt: row.exempt,
        }
      })
      return examsService.saveRows(sheet.id, rows).then(async (saved) => {
        if (submit) return examsService.submitSheet(sheet.id)
        return saved
      })
    },
    onSuccess: async (_data, submit) => {
      toast.success(submit ? "Marks submitted" : "Draft saved")
      await queryClient.invalidateQueries({ queryKey: ["exam-sheet", sheet?.id] })
      await queryClient.invalidateQueries({ queryKey: ["exams"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not save marks.")
    },
  })

  const reopen = useMutation({
    mutationFn: () => examsService.reopenSheet(sheet!.id),
    onSuccess: async () => {
      toast.success("Mark sheet reopened")
      await queryClient.invalidateQueries({ queryKey: ["exam-sheet", sheet?.id] })
      await queryClient.invalidateQueries({ queryKey: ["exams"] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not reopen the sheet.")
    },
  })

  function updateRow(studentId: number, patch: Partial<DraftRow>) {
    setDraft((rows) =>
      rows.map((row) => (row.studentId === studentId ? { ...row, ...patch } : row))
    )
  }

  const totalMarks = Number(sheetQuery.data?.totalMarks ?? sheet?.totalMarks ?? 0)
  const progress = draft.length === 0 ? 0 : Math.round((entered / draft.length) * 100)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm md:grid-cols-3">
        <Chooser
          label="Exam"
          value={examId}
          placeholder="Select exam"
          onChange={(value) => {
            setExamId(value)
            setClassId("")
            setSubjectId("")
          }}
          options={exams.map((item) => ({ value: String(item.id), label: item.name }))}
        />
        <Chooser
          label="Class"
          value={classId}
          placeholder="Select class"
          onChange={setClassId}
          options={classes.map((item) => ({ value: String(item.id), label: item.label }))}
        />
        <Chooser
          label="Subject"
          value={subjectId}
          placeholder="Select subject"
          onChange={setSubjectId}
          options={subjects.map((item) => ({
            value: String(item.subjectId),
            label: item.subject,
          }))}
        />
      </div>

      {!sheet ? (
        <div className="rounded-2xl border border-dashed border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)] shadow-sm">
          Choose an exam, class, and subject to enter marks.
        </div>
      ) : sheetQuery.isLoading ? (
        <div className="rounded-2xl border border-[var(--cls-border)] bg-white px-6 py-16 text-center text-sm text-[var(--cls-muted)] shadow-sm">
          Loading mark sheet…
        </div>
      ) : sheetQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-white px-6 py-10 text-center text-sm text-red-700 shadow-sm">
          {sheetQuery.error instanceof Error
            ? sheetQuery.error.message
            : "Could not load this mark sheet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--cls-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--cls-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-[var(--cls-ink)]">
                {classes.find((item) => String(item.id) === classId)?.label} · {sheet.subject}
              </p>
              <p className="text-xs text-[var(--cls-muted)]">
                Enter a mark, or mark the student absent or exempt. Cells lock after submission.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--cls-muted)]">
                {entered}/{draft.length} · {totalMarks} marks
              </span>
              <ExamStatusPill status={sheetQuery.data?.status ?? sheet.status} />
            </div>
          </div>
          <div className="h-1 bg-[var(--page-wash)]">
            <div className="h-full bg-[var(--primary-color)]" style={{ width: `${progress}%` }} />
          </div>
          {draft.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--cls-muted)]">
              This class has no active students, so there is nobody to mark yet.
            </p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[var(--page-wash)] text-[11px] tracking-wide text-[var(--cls-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Marks / {totalMarks}</th>
                  <th className="px-4 py-3 font-medium">Absent</th>
                  <th className="px-4 py-3 font-medium">Exempt</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((row, index) => {
                  const complete = row.absent || row.exempt || row.score.trim() !== ""
                  return (
                    <tr key={row.studentId} className="border-b border-[var(--cls-border)] last:border-0">
                      <td className="px-4 py-2 text-[var(--cls-muted)]">{index + 1}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-[var(--cls-muted)]">{row.admissionNo}</div>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          className="h-8 w-24"
                          inputMode="decimal"
                          disabled={!editable || row.absent || row.exempt}
                          value={row.score}
                          onChange={(event) =>
                            updateRow(row.studentId, { score: event.target.value })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={row.absent}
                          disabled={!editable}
                          onCheckedChange={(checked) =>
                            updateRow(row.studentId, {
                              absent: checked === true,
                              exempt: checked === true ? false : row.exempt,
                              score: checked === true ? "" : row.score,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={row.exempt}
                          disabled={!editable}
                          onCheckedChange={(checked) =>
                            updateRow(row.studentId, {
                              exempt: checked === true,
                              absent: checked === true ? false : row.absent,
                              score: checked === true ? "" : row.score,
                            })
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--cls-muted)]">
                        {complete ? "Entered" : "Pending"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}
          <div className="flex flex-col gap-3 border-t border-[var(--cls-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--cls-muted)]">
              Save as draft to keep progress. Submit when every student has a mark, an absence, or an exemption.
            </p>
            <div className="flex gap-2">
              {canManage && sheetQuery.data?.status !== "Draft" ? (
                <Button
                  variant="outline"
                  disabled={reopen.isPending}
                  onClick={() => reopen.mutate()}
                >
                  Reopen
                </Button>
              ) : null}
              {editable ? (
                <>
                  <Button
                    variant="outline"
                    disabled={save.isPending}
                    onClick={() => save.mutate(false)}
                  >
                    Save draft
                  </Button>
                  <Button disabled={save.isPending} onClick={() => save.mutate(true)}>
                    Submit final
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Chooser({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--cls-muted)]">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
