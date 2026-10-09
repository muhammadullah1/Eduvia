import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { studentName, useSchool } from "@/data/store"
import { type WeeklyTest } from "@/data/types"
import { weekdayOf } from "@/lib/academics"
import { useActor } from "@/lib/actor"
import { classLabel, formatDate } from "@/lib/format"

// ---- weekly subject tests (UR-05 / UR-06) ----------------------------------------------

export function MarksDialog({
  test,
  onClose,
}: {
  test: WeeklyTest | null
  onClose: () => void
}) {
  const { state, saveWeeklyMarks } = useSchool()
  const actor = useActor()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const current = test
    ? (state.weeklyTests.find((row) => row.id === test.id) ?? null)
    : null

  function close() {
    setDraft({})
    onClose()
  }

  function save() {
    if (!current) return
    const results = current.results.map((row) => {
      const raw = draft[row.studentId]
      if (raw === undefined) return row
      return {
        studentId: row.studentId,
        score: raw === "" ? null : Number(raw),
      }
    })
    const message = saveWeeklyMarks(current.id, results, actor)
    if (message) toast.error(message)
    else {
      toast.success("Marks saved — management publishes them to parents")
      close()
    }
  }

  return (
    <Dialog open={Boolean(current)} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {current ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {current.subject} · week {current.week}
              </DialogTitle>
              <DialogDescription>
                {classLabel(state.classes, current.classId)} ·{" "}
                {weekdayOf(current.date)} {formatDate(current.date)} · out of{" "}
                {current.max}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {current.results.map((row) => (
                <div
                  key={row.studentId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{studentName(state.students, row.studentId)}</span>
                  <Input
                    className="h-8 w-24"
                    inputMode="numeric"
                    disabled={current.status === "Published"}
                    value={
                      draft[row.studentId] ??
                      (row.score === null ? "" : String(row.score))
                    }
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [row.studentId]: event.target.value.replace(
                          /[^0-9.]/g,
                          ""
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Close
              </Button>
              {current.status !== "Published" ? (
                <Button onClick={save}>Save marks</Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
