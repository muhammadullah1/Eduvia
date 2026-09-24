import { useMemo, useState } from "react"
import { CloudUpload, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  FEE_PERIODS,
  FEE_TYPES,
  GRADE_OPTIONS,
  PAYMENT_METHODS,
  SAMPLE_FEE_CSV,
  SESSION_TODAY,
} from "@/data/session"
import { formatPkr } from "@/lib/format"
import { classRoster, findStudent } from "@/lib/selectors"
import { parseFeeCsv, reviewSyncRows, sheetLocked } from "@/lib/school"
import { useSchool } from "@/lib/school-context"
import type { AttendanceStatus, MarkEntry, Role, SyncRow } from "@/types"

import { roles } from "@/portal/roles"
import { toastResult } from "@/portal/feedback"
import { Field, StatusBadge, type PortalAction } from "@/portal/ui"

const titles: Record<Exclude<PortalAction, null>["kind"], string> = {
  admission: "Create new admission",
  payment: "Record fee payment",
  sync: "Synchronise offline fees",
  attendance: "Mark class attendance",
  marks: "Review mark sheet",
}

export function ActionDialog({
  action,
  role,
  onClose,
}: {
  action: PortalAction
  role: Role
  onClose: () => void
}) {
  const actor = roles[role].user
  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        {action ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {action.kind === "marks"
                  ? "Review mark sheet"
                  : action.kind === "attendance"
                    ? `Mark ${action.className}`
                    : titles[action.kind]}
              </DialogTitle>
              <DialogDescription>
                {action.kind === "sync"
                  ? "Every row is checked for a known student, a positive amount, and a unique receipt before it can enter the ledger."
                  : "Validation runs before anything is saved. Other roles see the same school session."}
              </DialogDescription>
            </DialogHeader>
            {action.kind === "admission" ? (
              <AdmissionForm actor={actor} onClose={onClose} />
            ) : null}
            {action.kind === "payment" ? (
              <PaymentForm
                actor={actor}
                studentId={action.studentId}
                onClose={onClose}
              />
            ) : null}
            {action.kind === "sync" ? (
              <SyncForm actor={actor} onClose={onClose} />
            ) : null}
            {action.kind === "attendance" ? (
              <AttendanceForm
                actor={actor}
                className={action.className}
                onClose={onClose}
              />
            ) : null}
            {action.kind === "marks" ? (
              <MarksForm
                actor={actor}
                role={role}
                sheetId={action.sheetId}
                onClose={onClose}
              />
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AdmissionForm({
  actor,
  onClose,
}: {
  actor: string
  onClose: () => void
}) {
  const { createAdmission } = useSchool()
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [grade, setGrade] = useState("Grade 7")
  const [guardian, setGuardian] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        const result = createAdmission(
          { name, dob, applyingFor: grade, guardian, notes },
          actor
        )
        if (toastResult(result)) onClose()
        else setError(result.ok ? null : result.error)
      }}
    >
      <Field
        label="Student name"
        htmlFor="admission-name"
        error={error?.includes("name") ? error : undefined}
      >
        <Input
          id="admission-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full legal name"
        />
      </Field>
      <Field label="Date of birth" htmlFor="admission-dob">
        <Input
          id="admission-dob"
          type="date"
          value={dob}
          max={SESSION_TODAY}
          onChange={(event) => setDob(event.target.value)}
        />
      </Field>
      <Field label="Applying for">
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {GRADE_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Guardian name" htmlFor="admission-guardian">
        <Input
          id="admission-guardian"
          value={guardian}
          onChange={(event) => setGuardian(event.target.value)}
          placeholder="Primary guardian"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Admission notes" htmlFor="admission-notes">
          <Textarea
            id="admission-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Interview, documents, or special notes…"
          />
        </Field>
      </div>
      {error ? (
        <p className="text-sm text-destructive sm:col-span-2">{error}</p>
      ) : null}
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save application</Button>
      </DialogFooter>
    </form>
  )
}

function PaymentForm({
  actor,
  studentId,
  onClose,
}: {
  actor: string
  studentId?: string
  onClose: () => void
}) {
  const { state, recordPayment } = useSchool()
  const students = state.students.filter(
    (student) => student.status === "Active"
  )
  const [selected, setSelected] = useState(
    studentId && students.some((student) => student.id === studentId)
      ? studentId
      : (students[0]?.id ?? "")
  )
  const [period, setPeriod] = useState(FEE_PERIODS[0])
  const [feeType, setFeeType] = useState(FEE_TYPES[0])
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [amount, setAmount] = useState("8500")
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)
  const billed = state.charges
    .filter(
      (item) =>
        item.studentId === selected &&
        item.period === period &&
        item.type === feeType
    )
    .reduce((total, item) => total + item.amount, 0)
  const paid = state.receipts
    .filter(
      (item) =>
        item.studentId === selected &&
        item.period === period &&
        item.type === feeType
    )
    .reduce((total, item) => total + item.amount, 0)
  const remaining = Math.max(0, billed - paid)
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        const result = recordPayment(
          {
            studentId: selected,
            period,
            feeType,
            method,
            amount: Number(amount),
            reference,
          },
          actor
        )
        if (toastResult(result)) onClose()
        else setError(result.ok ? null : result.error)
      }}
    >
      <div className="sm:col-span-2">
        <Field label="Student">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a student" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} · {student.id}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Fee period">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {FEE_PERIODS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Fee type">
        <Select value={feeType} onValueChange={setFeeType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {FEE_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Amount" htmlFor="payment-amount">
        <Input
          id="payment-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field label="Payment method">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PAYMENT_METHODS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Receipt reference" htmlFor="payment-ref">
          <Input
            id="payment-ref"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Must be unique, e.g. RCPT-1026-601"
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {billed > 0
          ? `${formatPkr(paid)} paid of ${formatPkr(billed)}. Remaining ${formatPkr(remaining)}.`
          : "No charge exists for this period yet. A payment is stored as an advance."}
      </p>
      {error ? (
        <p className="text-sm text-destructive sm:col-span-2">{error}</p>
      ) : null}
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save receipt</Button>
      </DialogFooter>
    </form>
  )
}

function SyncForm({ actor, onClose }: { actor: string; onClose: () => void }) {
  const { state, importReceipts } = useSchool()
  const [rows, setRows] = useState<SyncRow[] | null>(null)
  const [fileNote, setFileNote] = useState<string | null>(null)
  const verdicts = useMemo(
    () => (rows ? reviewSyncRows(state, rows) : []),
    [rows, state]
  )
  const ready = verdicts.filter((item) => item.outcome === "ready").length
  const load = (text: string, note: string) => {
    const parsed = parseFeeCsv(text)
    if (parsed.error) {
      setRows(null)
      setFileNote(parsed.error)
      return
    }
    setRows(parsed.rows)
    setFileNote(note)
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            load(
              SAMPLE_FEE_CSV,
              "Sample workbook loaded. It includes valid dues, a duplicate receipt, an unknown student, a pending student, a zero amount, and an already settled fee."
            )
          }
        >
          Load sample workbook
        </Button>
        <label className="inline-flex cursor-pointer items-center">
          <Input
            type="file"
            accept=".csv,text/csv"
            className="max-w-56"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              if (!file.name.toLowerCase().endsWith(".csv")) {
                toast.error(
                  "This prototype validates CSV. Excel parsing belongs to the backend phase. Load the sample workbook to see the checks."
                )
                return
              }
              void file
                .text()
                .then((text) => load(text, `Loaded ${file.name}.`))
            }}
          />
        </label>
      </div>
      {fileNote ? (
        <p className="text-xs leading-5 text-muted-foreground">{fileNote}</p>
      ) : null}
      {verdicts.length > 0 ? (
        <div className="grid gap-2">
          {verdicts.map((item, index) => (
            <div
              key={`${item.row.reference}-${index}`}
              className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="text-sm font-medium">
                  {item.row.reference || "Missing reference"} ·{" "}
                  {item.row.studentId || "No student"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.row.feeType || "Fee"} · {item.row.period || "No period"}{" "}
                  ·{" "}
                  {Number.isFinite(item.row.amount)
                    ? formatPkr(item.row.amount)
                    : "Invalid amount"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.reason}
                </p>
              </div>
              <StatusBadge
                value={
                  item.outcome === "ready"
                    ? "Ready"
                    : item.outcome === "skipped"
                      ? "Skipped"
                      : "Failed"
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Duplicate protection is on</AlertTitle>
          <AlertDescription>
            Load the sample workbook or a CSV. Existing receipt references are
            skipped and reported. Nothing is imported until you confirm.
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!rows || ready === 0}
          onClick={() => {
            if (!rows) return
            const result = importReceipts(rows, actor)
            if (toastResult(result)) onClose()
          }}
        >
          <CloudUpload data-icon="inline-start" />
          Import {ready} valid
        </Button>
      </DialogFooter>
    </div>
  )
}

function AttendanceForm({
  actor,
  className,
  onClose,
}: {
  actor: string
  className: string
  onClose: () => void
}) {
  const { state, saveAttendance } = useSchool()
  const roster = classRoster(state, className)
  const existing = state.attendance.filter(
    (mark) => mark.className === className && mark.date === SESSION_TODAY
  )
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(
      roster.map((student) => [
        student.id,
        existing.find((mark) => mark.studentId === student.id)?.status ??
          "Present",
      ])
    )
  )
  const cycle = (status: AttendanceStatus): AttendanceStatus =>
    status === "Present" ? "Absent" : status === "Absent" ? "Leave" : "Present"
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const result = saveAttendance(
          {
            className,
            date: SESSION_TODAY,
            marks: roster.map((student) => ({
              studentId: student.id,
              status: marks[student.id] ?? "Present",
            })),
          },
          actor
        )
        if (toastResult(result)) onClose()
      }}
    >
      <p className="text-xs text-muted-foreground">
        School day {SESSION_TODAY}. Click a status to cycle Present, Absent, and
        Leave.
      </p>
      {roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active students in this class.
        </p>
      ) : null}
      {roster.map((student) => {
        const status = marks[student.id] ?? "Present"
        return (
          <div
            key={student.id}
            className="flex items-center gap-3 rounded-xl border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.id}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setMarks((current) => ({
                  ...current,
                  [student.id]: cycle(status),
                }))
              }
            >
              <StatusBadge value={status} />
            </Button>
          </div>
        )
      })}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={roster.length === 0}>
          Save attendance
        </Button>
      </DialogFooter>
    </form>
  )
}

function MarksForm({
  actor,
  role,
  sheetId,
  onClose,
}: {
  actor: string
  role: Role
  sheetId?: string
  onClose: () => void
}) {
  const { state } = useSchool()
  const [selected, setSelected] = useState(
    sheetId ??
      state.markSheets.find((sheet) => sheet.status === "Submitted")?.id ??
      state.markSheets[0]?.id ??
      ""
  )
  const sheet = state.markSheets.find((item) => item.id === selected)
  if (!sheet)
    return (
      <p className="text-sm text-muted-foreground">
        No mark sheets are in this session.
      </p>
    )
  return (
    <div className="grid gap-4">
      {!sheetId ? (
        <Field label="Mark sheet">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {state.markSheets.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.exam} · {item.className} · {item.subject} ·{" "}
                    {item.status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <MarksEditor
        key={sheet.id + sheet.status}
        sheetId={sheet.id}
        role={role}
        actor={actor}
        onClose={onClose}
      />
    </div>
  )
}

function MarksEditor({
  sheetId,
  role,
  actor,
  onClose,
}: {
  sheetId: string
  role: Role
  actor: string
  onClose: () => void
}) {
  const { state, saveMarks, transitionSheet } = useSchool()
  const sheet = state.markSheets.find((item) => item.id === sheetId)
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (sheet?.entries ?? []).map((entry) => [
        entry.studentId,
        entry.score === null ? "" : String(entry.score),
      ])
    )
  )
  const [error, setError] = useState<string | null>(null)
  if (!sheet) return null
  const locked = sheetLocked(sheet.status) || role !== "teacher"
  const entries = (): MarkEntry[] | null => {
    const parsed: MarkEntry[] = []
    for (const entry of sheet.entries) {
      const raw = (scores[entry.studentId] ?? "").trim()
      if (!raw) {
        parsed.push({ studentId: entry.studentId, score: null })
        continue
      }
      const score = Number(raw)
      if (!Number.isInteger(score) || score < 0 || score > sheet.maxMarks) {
        setError(`Marks must be whole numbers from 0 to ${sheet.maxMarks}.`)
        return null
      }
      parsed.push({ studentId: entry.studentId, score })
    }
    return parsed
  }
  const save = (mode: "draft" | "submit") => {
    const parsed = entries()
    if (!parsed) return
    const result = saveMarks(sheetId, parsed, mode, actor)
    if (toastResult(result)) onClose()
    else setError(result.ok ? null : result.error)
  }
  const move = (to: "Verified" | "Published" | "Draft") => {
    const result = transitionSheet(sheetId, to, actor)
    if (toastResult(result)) onClose()
    else setError(result.ok ? null : result.error)
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {sheet.exam} · {sheet.subject}
          </p>
          <p className="text-xs text-muted-foreground">
            {sheet.className} · maximum {sheet.maxMarks} · {sheet.teacher}
          </p>
        </div>
        <StatusBadge value={sheet.status} />
      </div>
      {locked ? (
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>
            {sheet.status === "Draft"
              ? "Waiting for the teacher"
              : "This sheet is locked"}
          </AlertTitle>
          <AlertDescription>
            {sheet.status === "Published"
              ? "Parents can see these marks. Reopen the sheet before anyone can edit them."
              : sheet.status === "Draft"
                ? "Management reviews a sheet after the teacher submits it."
                : "Editing stays closed until management reopens the sheet."}
          </AlertDescription>
        </Alert>
      ) : null}
      {sheet.entries.map((entry) => {
        const student = findStudent(state, entry.studentId)
        const raw = scores[entry.studentId] ?? ""
        const invalid =
          raw.trim() !== "" &&
          (!Number.isInteger(Number(raw)) ||
            Number(raw) < 0 ||
            Number(raw) > sheet.maxMarks)
        return (
          <div
            key={entry.studentId}
            className="grid grid-cols-[1fr_96px_64px] items-center gap-3 rounded-xl border p-3"
          >
            <span className="text-sm font-medium">
              {student?.name ?? entry.studentId}
            </span>
            <Input
              aria-label={`Marks for ${student?.name ?? entry.studentId}`}
              value={raw}
              disabled={locked}
              inputMode="numeric"
              aria-invalid={invalid || undefined}
              onChange={(event) =>
                setScores((current) => ({
                  ...current,
                  [entry.studentId]: event.target.value,
                }))
              }
            />
            <span className="text-xs text-muted-foreground">
              / {sheet.maxMarks}
            </span>
          </div>
        )
      })}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {role === "teacher" && sheet.status === "Draft" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => save("draft")}
            >
              Save draft
            </Button>
            <Button type="button" onClick={() => save("submit")}>
              Submit and lock
            </Button>
          </>
        ) : null}
        {role === "management" && sheet.status === "Submitted" ? (
          <Button type="button" onClick={() => move("Verified")}>
            Verify
          </Button>
        ) : null}
        {role === "management" && sheet.status === "Verified" ? (
          <Button type="button" onClick={() => move("Published")}>
            Publish to parents
          </Button>
        ) : null}
        {role === "management" && sheet.status !== "Draft" ? (
          <Button type="button" variant="outline" onClick={() => move("Draft")}>
            Reopen
          </Button>
        ) : null}
      </DialogFooter>
    </div>
  )
}
