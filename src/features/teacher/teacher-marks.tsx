import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { studentName, useSchool } from "@/data/store"
import { useActor } from "@/lib/actor"
import { classLabel } from "@/lib/format"

import { signedInTeacher } from "./session"

export function TeacherMarks() {
  const { state, saveScores, setSheetStatus } = useSchool()
  const actor = useActor()
  const teacher = signedInTeacher(state.staff)
  const sheets = state.sheets.filter(
    (sheet) =>
      teacher?.classIds.includes(sheet.classId) &&
      teacher.subject === sheet.subject &&
      !sheet.examName.includes("August")
  )
  const [sheetId, setSheetId] = useState(sheets[0]?.id ?? "")
  const sheet = state.sheets.find((item) => item.id === sheetId) ?? sheets[0]
  const [scores, setScores] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  if (!sheet)
    return (
      <EmptyState
        title="No mark sheets"
        detail="Management has not assigned an exam to your classes."
      />
    )
  const locked = sheet.status !== "Draft"
  return (
    <div className="grid gap-4">
      <Alert>
        <AlertTitle>Controlled submission</AlertTitle>
        <AlertDescription>
          After you submit, scores lock until management reopens the sheet.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{sheet.examName}</CardTitle>
              <CardDescription>
                {classLabel(state.classes, sheet.classId)} · {sheet.subject} ·
                maximum {sheet.max}
              </CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Select
                value={sheet.id}
                onValueChange={(value) => {
                  setSheetId(value)
                  setScores({})
                  setError("")
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sheets.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.subject} ·{" "}
                        {classLabel(state.classes, item.classId)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <StatusBadge value={sheet.status} />
        </CardHeader>
        <CardContent className="grid gap-2">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {sheet.rows.map((row) => (
            <div
              key={row.studentId}
              className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-xl border px-3 py-2"
            >
              <span className="text-sm font-medium">
                {studentName(state.students, row.studentId)}
              </span>
              <Input
                disabled={locked}
                aria-invalid={Boolean(error)}
                type="number"
                min={0}
                max={sheet.max}
                value={scores[row.studentId] ?? row.score ?? ""}
                onChange={(event) =>
                  setScores({ ...scores, [row.studentId]: event.target.value })
                }
              />
            </div>
          ))}
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            variant="outline"
            disabled={locked}
            onClick={() => {
              const message = saveScores(
                sheet.id,
                sheet.rows.map((row) => ({
                  studentId: row.studentId,
                  score:
                    (scores[row.studentId] ?? row.score ?? "") === ""
                      ? null
                      : Number(scores[row.studentId] ?? row.score),
                })),
                actor.name
              )
              if (message) {
                setError(message)
                toast.error(message)
              } else {
                setError("")
                toast.success("Draft saved")
              }
            }}
          >
            Save draft
          </Button>
          <Button
            disabled={locked}
            onClick={() => {
              const saved = saveScores(
                sheet.id,
                sheet.rows.map((row) => ({
                  studentId: row.studentId,
                  score:
                    (scores[row.studentId] ?? row.score ?? "") === ""
                      ? null
                      : Number(scores[row.studentId] ?? row.score),
                })),
                actor.name
              )
              if (saved) {
                setError(saved)
                toast.error(saved)
                return
              }
              const message = setSheetStatus(sheet.id, "Submitted", actor.name)
              if (message) {
                setError(message)
                toast.error(message)
              } else toast.success("Sheet submitted and locked")
            }}
          >
            Submit sheet
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
