import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { SectionHeading, StatusBadge } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
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
import { studentName, useSchool } from "@/data/store"
import { type MarkSheet } from "@/data/types"
import { useActor } from "@/lib/actor"
import { portalPath } from "@/lib/auth"
import { classLabel, gradeFromScore } from "@/lib/format"

export function Examinations() {
  const { state, setSheetStatus } = useSchool()
  const actor = useActor()
  const navigate = useNavigate()
  const params = useParams()
  const sheetFromUrl = params["*"] ?? ""
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null)
  const activeSheetId =
    selectedSheetId !== null ? selectedSheetId : sheetFromUrl || null
  const current = useMemo(
    () =>
      activeSheetId
        ? (state.sheets.find((sheet) => sheet.id === activeSheetId) ?? null)
        : null,
    [activeSheetId, state.sheets]
  )
  const [status, setStatus] = useState("all")
  const rows = state.sheets.filter(
    (sheet) => status === "all" || sheet.status === status
  )

  function openSheet(sheet: MarkSheet) {
    setSelectedSheetId(sheet.id)
    navigate(portalPath(actor.role, "exams", sheet.id))
  }

  function closeSheet() {
    setSelectedSheetId("")
    navigate(portalPath(actor.role, "exams"))
  }

  return (
    <div className="grid gap-5">
      <SectionHeading
        title="Examinations"
        detail="Draft, submitted, verified, then published. Publishing never checks fees — parent visibility is decided at view time."
        action={
          <div className="w-48">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All statuses</SelectItem>
                  {["Draft", "Submitted", "Verified", "Published"].map(
                    (item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    )
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />
      <div className="grid gap-3">
        {rows.map((sheet) => {
          const entered = sheet.rows.filter((row) => row.score !== null).length
          const progress = sheet.rows.length
            ? Math.round((entered / sheet.rows.length) * 100)
            : 0
          return (
            <Card key={sheet.id}>
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                <div>
                  <p className="font-medium">{sheet.examName}</p>
                  <p className="text-xs text-muted-foreground">
                    {classLabel(state.classes, sheet.classId)} · {sheet.subject}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entered</p>
                  <p className="text-sm font-medium">
                    {entered}/{sheet.rows.length}
                  </p>
                </div>
                <Progress value={progress} />
                <div className="flex items-center gap-2">
                  <StatusBadge value={sheet.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSheet(sheet)}
                  >
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog
        open={Boolean(current)}
        onOpenChange={(value) => !value && closeSheet()}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {current ? (
            <>
              <DialogHeader>
                <DialogTitle>{current.subject}</DialogTitle>
                <DialogDescription>
                  {current.examName} ·{" "}
                  {classLabel(state.classes, current.classId)} · max{" "}
                  {current.max}
                </DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.rows.map((row) => (
                    <TableRow key={row.studentId}>
                      <TableCell>
                        {studentName(state.students, row.studentId)}
                      </TableCell>
                      <TableCell>{row.score ?? "—"}</TableCell>
                      <TableCell>
                        {row.score === null
                          ? "—"
                          : gradeFromScore(row.score, current.max)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DialogFooter>
                {current.status === "Submitted" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const message = setSheetStatus(
                        current.id,
                        "Verified",
                        actor.name
                      )
                      if (message) toast.error(message)
                      else toast.success("Sheet verified")
                    }}
                  >
                    Verify
                  </Button>
                ) : null}
                {current.status === "Verified" ? (
                  <Button
                    onClick={() => {
                      const message = setSheetStatus(
                        current.id,
                        "Published",
                        actor.name
                      )
                      if (message) toast.error(message)
                      else toast.success("Results published to parents")
                    }}
                  >
                    Publish
                  </Button>
                ) : null}
                {current.status !== "Draft" ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const message = setSheetStatus(
                        current.id,
                        "Draft",
                        actor.name
                      )
                      if (message) toast.error(message)
                      else toast.success("Sheet reopened")
                    }}
                  >
                    Reopen
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Super admin fee desk: overall totals, the full ledger and offline sync (UR-01 / UR-08). */
