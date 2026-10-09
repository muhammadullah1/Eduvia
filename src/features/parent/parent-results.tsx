import { Download, Lock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { EmptyState, SectionHeading, StatusBadge } from "@/components/app/kit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { monthLabel } from "@/lib/fees"
import { classLabel, gradeFromScore } from "@/lib/format"

import { ChildSwitcher } from "./child-switcher"
import { useChild } from "./use-child"
import { unpaidMonths, visibilityFor } from "./visibility"

export function ParentResults() {
  const { state, child, childId, setChildId, options } = useChild()
  const sheets = state.sheets.filter(
    (sheet) => sheet.classId === child.classId && sheet.status === "Published"
  )
  const exams = [
    ...new Map(sheets.map((sheet) => [sheet.examId, sheet.examName])).entries(),
  ]
  const [examChoice, setExam] = useState(exams[0]?.[0] ?? "")
  const examId = exams.some(([id]) => id === examChoice)
    ? examChoice
    : (exams[0]?.[0] ?? "")
  const rows = sheets.filter((sheet) => sheet.examId === examId)
  const gate = rows[0] ? visibilityFor(state, rows[0], child.id) : null
  const visible = Boolean(gate?.visible)
  const scores = visible
    ? rows.flatMap((sheet) =>
        sheet.rows
          .filter((row) => row.studentId === child.id && row.score !== null)
          .map((row) => ((row.score as number) / sheet.max) * 100)
      )
    : []
  const overall = scores.length
    ? Math.round(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10
      ) / 10
    : 0
  const unpaid = unpaidMonths(state, child.id)
  return (
    <div className="grid gap-5">
      <SectionHeading
        title="Results & DMC"
        detail="Only published examinations are visible."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ChildSwitcher
              childId={childId}
              onChange={setChildId}
              options={options}
            />
            {exams.length ? (
              <div className="w-full sm:w-72">
                <Select value={examId} onValueChange={setExam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {exams.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No published results"
          detail="When the school publishes an exam for this class, the DMC will show here."
        />
      ) : !visible ? (
        <Alert>
          <Lock className="size-4" />
          <AlertTitle>Result withheld</AlertTitle>
          <AlertDescription>
            {rows[0].examName} is published, but it is held until fees are
            cleared
            {unpaid.length
              ? ` (${unpaid.map((month) => monthLabel(month.month)).join(", ")})`
              : ""}
            . Please contact the school office.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <StatusBadge value="Published" />
                <h2 className="mt-4 font-heading text-2xl font-semibold">
                  {rows[0].examName}
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/70">
                  {classLabel(state.classes, child.classId)}
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-foreground/60">Overall</p>
                <p className="font-heading text-3xl font-semibold">
                  {overall}%
                </p>
              </div>
            </div>
          </div>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((sheet) => {
                  const score =
                    sheet.rows.find((row) => row.studentId === child.id)
                      ?.score ?? null
                  return (
                    <TableRow key={sheet.id}>
                      <TableCell className="font-medium">
                        {sheet.subject}
                      </TableCell>
                      <TableCell>
                        {score ?? "—"} / {sheet.max}
                      </TableCell>
                      <TableCell>
                        {score === null ? (
                          "—"
                        ) : (
                          <StatusBadge
                            value={gradeFromScore(score, sheet.max)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => toast.success(`DMC prepared for ${child.name}`)}
            >
              <Download data-icon="inline-start" />
              Download DMC
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

/** Published weekly test marks and the month's outcome per subject (UR-05 / UR-06). */
