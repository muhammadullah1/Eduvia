import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import examsService, { type DailyTestDto, type DailyTestMark,dailyTestOutOf } from "@/api/exams/exams.service"
import studentsService from "@/api/students/students.service"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { marksInput } from "@/lib/marks"
import { toast } from "@/lib/toast"

type Entry = { score: string; absent: boolean }

type Props = {
  test: DailyTestDto
  onClose: () => void
  onSaved: () => void
}

/** Enter one weekly test's marks; a student is either scored or absent. */
export function DailyMarksDialog({ test, onClose, onSaved }: Props) {
  const maxScore = dailyTestOutOf(test)
  const locked = test.status === "Published"
  const [edits, setEdits] = useState<Record<number, Entry>>({})

  const detail = useQuery({
    queryKey: ["daily-tests", "detail", test.id],
    queryFn: () => examsService.dailyTest(test.id),
  })
  const students = useQuery({
    queryKey: ["students", "class", test.fkClassId],
    queryFn: () => studentsService.list({ classId: test.fkClassId, status: "Active", pageSize: 200 }),
  })

  const saved = new Map((detail.data?.results ?? []).map((row) => [row.fkStudentId, row]))
  const entryFor = (studentId: number): Entry => {
    if (edits[studentId]) return edits[studentId]
    const row = saved.get(studentId)
    return {
      score: row?.obtainedMarks != null ? String(Number(row.obtainedMarks)) : "",
      absent: Boolean(row?.isAbsent),
    }
  }
  const update = (studentId: number, patch: Partial<Entry>) =>
    setEdits((current) => ({ ...current, [studentId]: { ...entryFor(studentId), ...patch } }))

  const roster = students.data?.students ?? []
  const invalid = roster.filter((student) => {
    const entry = entryFor(student.id)
    if (entry.absent || entry.score === "") return false
    const value = Number(entry.score)
    return !Number.isFinite(value) || value < 0 || value > maxScore
  })

  const save = useMutation({
    mutationFn: () => {
      const marks: DailyTestMark[] = roster
        .map((student) => ({ student, entry: entryFor(student.id) }))
        .filter(({ entry }) => entry.absent || entry.score !== "")
        .map(({ student, entry }) => ({
          studentId: student.id,
          score: entry.absent ? null : Number(entry.score),
          absent: entry.absent,
        }))
      return examsService.saveDailyMarks(test.id, marks)
    },
    onSuccess: () => {
      toast.success("Marks saved.")
      onSaved()
      onClose()
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save marks."),
  })

  const loading = detail.isLoading || students.isLoading
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {test.class?.label} · {test.subject?.name}
          </DialogTitle>
          <DialogDescription>
            {test.date} · out of {maxScore}
            {locked ? " · published, marks are locked" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--cls-border)]">
          {loading ? (
            <p className="p-4 text-sm text-[var(--cls-muted)]">Loading students…</p>
          ) : roster.length === 0 ? (
            <p className="p-4 text-sm text-[var(--cls-muted)]">No active students in this class.</p>
          ) : (
            <ul className="divide-y divide-[var(--cls-border)]">
              {roster.map((student) => {
                const entry = entryFor(student.id)
                const bad = invalid.includes(student)
                return (
                  <li key={student.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--cls-ink)]">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-[var(--cls-muted)]">{student.admissionNo}</p>
                    </div>
                    <Input
                      aria-label={`Score for ${student.firstName} ${student.lastName}`}
                      inputMode="decimal"
                      className="h-8 w-20 text-right tabular-nums"
                      aria-invalid={bad || undefined}
                      disabled={locked || entry.absent}
                      value={entry.absent ? "" : entry.score}
                      placeholder={entry.absent ? "—" : `/${maxScore}`}
                      onChange={(event) => update(student.id, { score: marksInput(event.target.value) })}
                    />
                    <label className="flex items-center gap-1.5 text-xs text-[var(--cls-muted)]">
                      <Checkbox
                        aria-label={`${student.firstName} ${student.lastName} absent`}
                        checked={entry.absent}
                        disabled={locked}
                        onCheckedChange={(checked) => update(student.id, { absent: checked === true, score: "" })}
                      />
                      Absent
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {invalid.length ? (
          <p className="text-xs text-red-700">Scores must be between 0 and {maxScore}.</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {locked ? "Close" : "Cancel"}
          </Button>
          {locked ? null : (
            <Button disabled={loading || invalid.length > 0 || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save marks"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
