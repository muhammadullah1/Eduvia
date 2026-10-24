import { FileSpreadsheet, FileText, Printer } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import attendanceReviewService from "@/api/attendance/attendance-review.service"
import { Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MonthPicker } from "@/components/ui/month-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getToday } from "@/lib/dates"

type ClassOption = { id: string; label: string; status?: string }

/**
 * Paper attendance register: the class's active students with blank P/A/L/Leave boxes,
 * the Super Master, a date (or every day of a month) and signature lines.
 */
export function PrintSheetButton({ classes, defaultClassId }: { classes: ClassOption[]; defaultClassId: string }) {
  const today = getToday()
  const [open, setOpen] = useState(false)
  const [classId, setClassId] = useState("")
  const [mode, setMode] = useState<"day" | "month">("day")
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null)
  const chosen = classId || defaultClassId

  const download = async (format: "pdf" | "xlsx") => {
    if (!chosen) return
    setBusy(format)
    try {
      const name = await attendanceReviewService.downloadSheet({
        classId: chosen,
        format,
        ...(mode === "day" ? { date } : { month }),
      })
      toast.success(`Downloaded ${name}`)
    } catch (err) {
      toast.error("Attendance sheet not downloaded", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={!classes.length}>
        <Printer data-icon="inline-start" />
        Print attendance sheet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print attendance sheet</DialogTitle>
            <DialogDescription>
              A paper register with every active student, blank P / A / L / Leave boxes, the class's Super Master and
              signature lines.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Class">
              <Select value={chosen} onValueChange={setClassId}>
                <SelectTrigger className="w-full" aria-label="Class">
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((klass) => (
                    <SelectItem key={klass.id} value={klass.id}>
                      {klass.label}
                      {klass.status && klass.status !== "Active" ? " (inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sheet for">
              <ToggleGroup
                type="single"
                variant="outline"
                value={mode}
                onValueChange={(value) => value && setMode(value as "day" | "month")}
                aria-label="Sheet for"
              >
                <ToggleGroupItem value="day">One day</ToggleGroupItem>
                <ToggleGroupItem value="month">Whole month</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            {mode === "day" ? (
              <Field label="Date">
                <DatePicker value={date} onChange={(value) => setDate(value || today)} defaultMonthKind="today" popoverClassName="z-[100]" aria-label="Date" />
              </Field>
            ) : (
              <Field label="Month" hint="One column per day; Sundays are shaded.">
                <MonthPicker value={month} onChange={setMonth} monthsBack={12} monthsAhead={3} aria-label="Month" />
              </Field>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={!chosen || Boolean(busy)} onClick={() => void download("xlsx")}>
              <FileSpreadsheet data-icon="inline-start" />
              {busy === "xlsx" ? "Preparing…" : "Excel"}
            </Button>
            <Button disabled={!chosen || Boolean(busy)} onClick={() => void download("pdf")}>
              <FileText data-icon="inline-start" />
              {busy === "pdf" ? "Preparing…" : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
