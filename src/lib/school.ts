import { SESSION_TODAY } from "@/data/session"
import type {
  ActionResult,
  AdmissionInput,
  AttendanceInput,
  AttendanceStatus,
  MarkEntry,
  PaymentInput,
  SchoolState,
  SheetStatus,
  SyncRow,
  SyncVerdict,
  UpdateInput,
} from "@/types"

const REF_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,24}$/
const ATTENDANCE: AttendanceStatus[] = ["Present", "Absent", "Leave"]

export function sheetLocked(status: SheetStatus) {
  return status !== "Draft"
}

export function cleanReference(value: string) {
  return value.trim().toUpperCase()
}

export function parseFeeCsv(text: string): { rows: SyncRow[]; error?: string } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    return {
      rows: [],
      error: "The file needs a header row and at least one fee row.",
    }
  }
  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase())
  const column = (...names: string[]) =>
    header.findIndex((cell) => names.includes(cell))
  const reference = column("reference", "receipt", "receipt reference")
  const studentId = column("studentid", "student id", "student")
  const period = column("period", "month")
  const feeType = column("type", "fee", "feetype", "fee type")
  const amount = column("amount")
  if (
    [reference, studentId, period, feeType, amount].some((index) => index < 0)
  ) {
    return {
      rows: [],
      error: "Use columns reference, studentId, period, type, and amount.",
    }
  }
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim())
    const parsed = Number(cells[amount])
    return {
      reference: cells[reference] ?? "",
      studentId: (cells[studentId] ?? "").toUpperCase(),
      period: cells[period] ?? "",
      feeType: cells[feeType] ?? "",
      amount: parsed,
    }
  })
  return { rows }
}

export function reviewSyncRows(
  state: SchoolState,
  rows: SyncRow[]
): SyncVerdict[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    const verdict = assessRow(state, row, seen)
    return {
      row: {
        ...row,
        reference: cleanReference(row.reference),
        studentId: row.studentId.trim().toUpperCase(),
      },
      ...verdict,
    }
  })
}

function assessRow(
  state: SchoolState,
  row: SyncRow,
  seen: Set<string>
): Pick<SyncVerdict, "outcome" | "reason"> {
  const reference = cleanReference(row.reference)
  if (!REF_PATTERN.test(reference)) {
    return {
      outcome: "failed",
      reason: "Receipt reference must be 3–25 letters, numbers, or hyphens.",
    }
  }
  if (
    seen.has(reference) ||
    state.receipts.some((item) => item.id === reference)
  ) {
    seen.add(reference)
    return { outcome: "skipped", reason: "Duplicate receipt reference." }
  }
  seen.add(reference)
  const student = state.students.find(
    (item) => item.id.toUpperCase() === row.studentId.trim().toUpperCase()
  )
  if (!student)
    return { outcome: "failed", reason: "Student ID was not found." }
  if (student.status !== "Active") {
    return {
      outcome: "failed",
      reason: `${student.name} is ${student.status.toLowerCase()} and cannot take a payment.`,
    }
  }
  if (!row.period.trim() || !row.feeType.trim()) {
    return { outcome: "failed", reason: "Period and fee type are required." }
  }
  if (!validMoney(row.amount))
    return { outcome: "failed", reason: "Amount must be greater than 0." }
  if (isSettled(state, student.id, row.period.trim(), row.feeType.trim())) {
    return {
      outcome: "skipped",
      reason: `${student.name} is already settled for ${row.feeType} · ${row.period}.`,
    }
  }
  return { outcome: "ready", reason: "Ready to import." }
}

export function applyAdmission(
  state: SchoolState,
  input: AdmissionInput,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const name = input.name.trim()
  const guardian = input.guardian.trim()
  const notes = input.notes.trim()
  const applyingFor = input.applyingFor.trim()
  if (name.length < 2) return fail(state, "Enter the student’s full name.")
  if (guardian.length < 2)
    return fail(state, "Enter the primary guardian’s name.")
  if (!applyingFor) return fail(state, "Choose the grade being applied for.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dob))
    return fail(state, "Enter a valid date of birth.")
  const age = ageOn(input.dob, SESSION_TODAY)
  if (age === null || input.dob > SESSION_TODAY)
    return fail(state, "Date of birth cannot be in the future.")
  if (age < 3 || age > 20)
    return fail(state, "Age must be between 3 and 20 for this session.")
  if (notes.length > 400)
    return fail(state, "Keep admission notes under 400 characters.")
  const idNumber = state.counters.admission + 1
  const id = `ADM-${idNumber}`
  const next = audit(
    {
      ...state,
      counters: { ...state.counters, admission: idNumber },
      admissions: [
        {
          id,
          name,
          dob: input.dob,
          applyingFor,
          guardian,
          notes,
          status: "New",
          appliedOn: SESSION_TODAY,
        },
        ...state.admissions,
      ],
    },
    actor,
    `Created admission ${id} for ${name}`
  )
  return ok(next, `${name} is in the admissions queue as ${id}.`)
}

export function applyAdmissionDecision(
  state: SchoolState,
  id: string,
  decision: "enroll" | "reject",
  actor: string
): { state: SchoolState; result: ActionResult } {
  const admission = state.admissions.find((item) => item.id === id)
  if (!admission)
    return fail(state, "That application is no longer in the queue.")
  if (admission.status === "Enrolled" || admission.status === "Rejected") {
    return fail(
      state,
      `${admission.name} is already ${admission.status.toLowerCase()}.`
    )
  }
  if (decision === "reject") {
    const next = audit(
      {
        ...state,
        admissions: state.admissions.map((item) =>
          item.id === id ? { ...item, status: "Rejected" as const } : item
        ),
      },
      actor,
      `Rejected admission ${id} for ${admission.name}`
    )
    return ok(next, `${admission.name} was rejected.`)
  }
  const studentNumber = state.counters.student + 1
  const studentId = `CLS-${studentNumber}`
  const className = `${admission.applyingFor} · Blue`
  const student = {
    id: studentId,
    name: admission.name,
    className,
    rollNo: String(
      state.students.filter((item) => item.className === className).length + 1
    ).padStart(2, "0"),
    guardian: admission.guardian,
    parentName: null,
    status: "Active" as const,
  }
  let next: SchoolState = {
    ...state,
    counters: { ...state.counters, student: studentNumber },
    students: [student, ...state.students],
    admissions: state.admissions.map((item) =>
      item.id === id ? { ...item, status: "Enrolled" as const } : item
    ),
    charges: [
      {
        id: `CHG-${studentId}-SEP-TUI`,
        studentId,
        period: "September 2026",
        type: "Tuition",
        amount: 8500,
        due: "2026-09-10",
      },
      ...state.charges,
    ],
    markSheets: appendDraftEntry(state.markSheets, className, studentId),
  }
  next = audit(
    next,
    actor,
    `Enrolled ${admission.name} as ${studentId} in ${className}`
  )
  return ok(
    next,
    `${admission.name} is now ${studentId} in ${className}. September tuition is outstanding.`
  )
}

export function applyActivation(
  state: SchoolState,
  studentId: string,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const student = state.students.find((item) => item.id === studentId)
  if (!student) return fail(state, "Student not found.")
  if (student.status === "Active")
    return fail(state, `${student.name} is already active.`)
  if (student.status === "Inactive")
    return fail(
      state,
      `${student.name} is inactive. Reactivation needs a recorded decision outside this demo.`
    )
  const hasCharge = state.charges.some(
    (item) =>
      item.studentId === studentId &&
      item.period === "September 2026" &&
      item.type === "Tuition"
  )
  const next = audit(
    {
      ...state,
      students: state.students.map((item) =>
        item.id === studentId ? { ...item, status: "Active" as const } : item
      ),
      charges: hasCharge
        ? state.charges
        : [
            {
              id: `CHG-${studentId}-SEP-TUI`,
              studentId,
              period: "September 2026",
              type: "Tuition",
              amount: 8500,
              due: "2026-09-10",
            },
            ...state.charges,
          ],
      markSheets: appendDraftEntry(
        state.markSheets,
        student.className,
        studentId
      ),
    },
    actor,
    `Activated enrollment for ${student.name}`
  )
  return ok(
    next,
    `${student.name} is active and can be marked, billed, and included on draft mark sheets.`
  )
}

export function applyPayment(
  state: SchoolState,
  input: PaymentInput,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const reference = cleanReference(input.reference)
  if (!REF_PATTERN.test(reference))
    return fail(
      state,
      "Receipt reference must be 3–25 letters, numbers, or hyphens."
    )
  if (state.receipts.some((item) => item.id === reference))
    return fail(state, `${reference} is already on the ledger.`)
  const student = state.students.find((item) => item.id === input.studentId)
  if (!student) return fail(state, "Choose an enrolled student.")
  if (student.status !== "Active")
    return fail(
      state,
      `${student.name} is ${student.status.toLowerCase()} and cannot take a payment.`
    )
  if (!input.period.trim() || !input.feeType.trim() || !input.method.trim()) {
    return fail(state, "Period, fee type, and payment method are required.")
  }
  if (!validMoney(input.amount))
    return fail(state, "Enter an amount greater than 0.")
  if (isSettled(state, student.id, input.period, input.feeType)) {
    return fail(
      state,
      `${student.name} is already settled for ${input.feeType} · ${input.period}.`
    )
  }
  const billed = billedToward(state, student.id, input.period, input.feeType)
  const paid = paidToward(state, student.id, input.period, input.feeType)
  const remaining = Math.max(0, billed - paid)
  const advance =
    billed === 0 ? input.amount : Math.max(0, input.amount - remaining)
  const next = audit(
    {
      ...state,
      receipts: [
        {
          id: reference,
          studentId: student.id,
          studentName: student.name,
          period: input.period,
          type: input.feeType,
          amount: input.amount,
          method: input.method,
          paidOn: SESSION_TODAY,
          source: "desk",
        },
        ...state.receipts,
      ],
    },
    actor,
    `Recorded ${reference} for ${student.name} · ${input.feeType} ${input.period}`
  )
  const advanceNote =
    advance > 0 ? ` ₨ ${advance.toLocaleString("en-PK")} is an advance.` : ""
  return ok(next, `Recorded ${reference} for ${student.name}.${advanceNote}`)
}

export function applyImport(
  state: SchoolState,
  rows: SyncRow[],
  actor: string
): { state: SchoolState; result: ActionResult } {
  const verdicts = reviewSyncRows(state, rows)
  const ready = verdicts.filter((item) => item.outcome === "ready")
  if (ready.length === 0) {
    return fail(
      state,
      "Nothing to import. Resolve failed rows or remove duplicates first."
    )
  }
  const imported = ready.map((item) => {
    const student = state.students.find(
      (person) => person.id === item.row.studentId
    )!
    return {
      id: item.row.reference,
      studentId: student.id,
      studentName: student.name,
      period: item.row.period.trim(),
      type: item.row.feeType.trim(),
      amount: item.row.amount,
      method: "Offline sync",
      paidOn: SESSION_TODAY,
      source: "sync" as const,
    }
  })
  const skipped = verdicts.filter((item) => item.outcome === "skipped").length
  const failed = verdicts.filter((item) => item.outcome === "failed").length
  const next = audit(
    { ...state, receipts: [...imported, ...state.receipts] },
    actor,
    `Imported ${imported.length} offline fee row${imported.length === 1 ? "" : "s"} (${skipped} skipped, ${failed} failed)`
  )
  return ok(
    next,
    `Imported ${imported.length} · skipped ${skipped} · failed ${failed}.`
  )
}

export function applyAttendance(
  state: SchoolState,
  input: AttendanceInput,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const roster = state.students.filter(
    (student) =>
      student.className === input.className && student.status === "Active"
  )
  if (roster.length === 0)
    return fail(state, "This class has no active students to mark.")
  if (input.date !== SESSION_TODAY)
    return fail(
      state,
      "Attendance in this demo can be saved for the current school day only."
    )
  const ids = new Set(input.marks.map((mark) => mark.studentId))
  if (
    ids.size !== input.marks.length ||
    roster.some((student) => !ids.has(student.id)) ||
    ids.size !== roster.length
  ) {
    return fail(state, "Mark every active student in the class once.")
  }
  if (input.marks.some((mark) => !ATTENDANCE.includes(mark.status))) {
    return fail(state, "Each student must be Present, Absent, or Leave.")
  }
  const kept = state.attendance.filter(
    (mark) => !(mark.className === input.className && mark.date === input.date)
  )
  const saved = input.marks.map((mark) => ({
    ...mark,
    className: input.className,
    date: input.date,
  }))
  const present = saved.filter((mark) => mark.status === "Present").length
  const next = audit(
    { ...state, attendance: [...saved, ...kept] },
    actor,
    `Saved ${input.className} attendance for ${input.date} (${present} present)`
  )
  return ok(
    next,
    `${input.className} attendance saved · ${present} present of ${saved.length}.`
  )
}

export function applyLesson(
  state: SchoolState,
  lessonId: string,
  progress: number,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const lesson = state.lessons.find((item) => item.id === lessonId)
  if (!lesson) return fail(state, "Lesson not found.")
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    return fail(state, "Progress must be a whole number from 0 to 100.")
  }
  const next = audit(
    {
      ...state,
      lessons: state.lessons.map((item) =>
        item.id === lessonId ? { ...item, progress } : item
      ),
    },
    actor,
    `Updated “${lesson.title}” to ${progress}%`
  )
  return ok(next, `${lesson.title} is now ${progress}% complete.`)
}

export function applyUpdate(
  state: SchoolState,
  input: UpdateInput,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const text = input.text.trim()
  if (!input.className || !input.type || !input.subject.trim()) {
    return fail(state, "Choose a class, update type, and subject.")
  }
  if (text.length < 10)
    return fail(
      state,
      "Write at least 10 characters so families know what to do."
    )
  if (text.length > 400)
    return fail(state, "Keep the update under 400 characters.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due))
    return fail(state, "Add a due or event date.")
  const updateNumber = state.counters.update + 1
  const id = `UP-${updateNumber}`
  const next = audit(
    {
      ...state,
      counters: { ...state.counters, update: updateNumber },
      updates: [
        {
          id,
          type: input.type,
          className: input.className,
          subject: input.subject.trim(),
          text,
          due: input.due,
          status: "Pending",
          author: actor,
        },
        ...state.updates,
      ],
    },
    actor,
    `Submitted ${input.type.toLowerCase()} ${id} for approval`
  )
  return ok(
    next,
    "Submitted for approval. Parents will see it after management publishes it."
  )
}

export function applyResubmit(
  state: SchoolState,
  id: string,
  actor: string
): { state: SchoolState; result: ActionResult } {
  const update = state.updates.find((item) => item.id === id)
  if (!update || update.status !== "Draft")
    return fail(state, "Only a returned draft can be submitted again.")
  const next = audit(
    {
      ...state,
      updates: state.updates.map((item) =>
        item.id === id ? { ...item, status: "Pending" as const } : item
      ),
    },
    actor,
    `Resubmitted ${id} for approval`
  )
  return ok(next, "Submitted again for management approval.")
}

export function applyUpdateStatus(
  state: SchoolState,
  id: string,
  status: "Published" | "Draft",
  actor: string
): { state: SchoolState; result: ActionResult } {
  const update = state.updates.find((item) => item.id === id)
  if (!update) return fail(state, "Update not found.")
  if (
    update.status !== "Pending" &&
    !(update.status === "Draft" && status === "Published")
  ) {
    if (update.status === "Published")
      return fail(state, "That update is already visible to parents.")
    if (status === "Draft" && update.status === "Draft")
      return fail(state, "That update is already a draft.")
  }
  if (status === "Published" && update.status === "Draft") {
    return fail(state, "Ask the teacher to submit the draft before publishing.")
  }
  if (update.status !== "Pending")
    return fail(
      state,
      "Only updates waiting for approval can be published or returned."
    )
  const next = audit(
    {
      ...state,
      updates: state.updates.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    },
    actor,
    status === "Published"
      ? `Published ${update.type.toLowerCase()} “${update.text}”`
      : `Returned ${id} to the teacher`
  )
  return ok(
    next,
    status === "Published"
      ? "Published. Linked parents can see this update."
      : "Returned to the teacher as a draft."
  )
}

export function applyMarks(
  state: SchoolState,
  sheetId: string,
  entries: MarkEntry[],
  mode: "draft" | "submit",
  actor: string
): { state: SchoolState; result: ActionResult } {
  const sheet = state.markSheets.find((item) => item.id === sheetId)
  if (!sheet) return fail(state, "Mark sheet not found.")
  if (sheetLocked(sheet.status)) {
    return fail(
      state,
      `This sheet is ${sheet.status.toLowerCase()} and locked. Management has to reopen it.`
    )
  }
  const parsed = parseEntries(sheet.entries, entries, sheet.maxMarks)
  if (!parsed.ok) return fail(state, parsed.error)
  if (
    mode === "submit" &&
    parsed.entries.some((entry) => entry.score === null)
  ) {
    return fail(
      state,
      "Enter every student before submitting. Empty marks can stay on a draft."
    )
  }
  const status = mode === "submit" ? "Submitted" : "Draft"
  const next = audit(
    {
      ...state,
      markSheets: state.markSheets.map((item) =>
        item.id === sheetId
          ? { ...item, entries: parsed.entries, status }
          : item
      ),
    },
    actor,
    mode === "submit"
      ? `Submitted ${sheet.className} ${sheet.subject} marks`
      : `Saved draft marks for ${sheet.className} ${sheet.subject}`
  )
  return ok(
    next,
    mode === "submit"
      ? "Submitted and locked. Management can verify or reopen it."
      : "Draft saved. You can still edit these marks."
  )
}

export function applySheetTransition(
  state: SchoolState,
  sheetId: string,
  to: "Verified" | "Published" | "Draft",
  actor: string
): { state: SchoolState; result: ActionResult } {
  const sheet = state.markSheets.find((item) => item.id === sheetId)
  if (!sheet) return fail(state, "Mark sheet not found.")
  const allowed =
    (to === "Verified" && sheet.status === "Submitted") ||
    (to === "Published" && sheet.status === "Verified") ||
    (to === "Draft" && sheet.status !== "Draft")
  if (!allowed) {
    return fail(
      state,
      `Cannot move a ${sheet.status.toLowerCase()} sheet to ${to.toLowerCase()}.`
    )
  }
  if (
    to === "Published" &&
    sheet.entries.some((entry) => entry.score === null)
  ) {
    return fail(state, "This sheet still has empty marks.")
  }
  const verb =
    to === "Draft" ? "Reopened" : to === "Verified" ? "Verified" : "Published"
  const next = audit(
    {
      ...state,
      markSheets: state.markSheets.map((item) =>
        item.id === sheetId ? { ...item, status: to } : item
      ),
    },
    actor,
    `${verb} ${sheet.exam} · ${sheet.className} · ${sheet.subject}`
  )
  const message =
    to === "Draft"
      ? "Sheet reopened. The teacher can edit it again, and parents no longer see it as a result."
      : to === "Verified"
        ? "Verified. Publish it when the class set is ready for parents."
        : "Published. Parents of this class can now open the result."
  return ok(next, message)
}

function parseEntries(
  current: MarkEntry[],
  entries: MarkEntry[],
  maxMarks: number
): { ok: true; entries: MarkEntry[] } | { ok: false; error: string } {
  if (entries.length !== current.length)
    return { ok: false, error: "The mark sheet rows do not match the class." }
  const next: MarkEntry[] = []
  for (const existing of current) {
    const incoming = entries.find(
      (entry) => entry.studentId === existing.studentId
    )
    if (!incoming)
      return { ok: false, error: "The mark sheet rows do not match the class." }
    if (incoming.score === null) {
      next.push({ studentId: existing.studentId, score: null })
      continue
    }
    if (
      !Number.isInteger(incoming.score) ||
      incoming.score < 0 ||
      incoming.score > maxMarks
    ) {
      return {
        ok: false,
        error: `Marks must be whole numbers from 0 to ${maxMarks}.`,
      }
    }
    next.push({ studentId: existing.studentId, score: incoming.score })
  }
  return { ok: true, entries: next }
}

function appendDraftEntry(
  sheets: SchoolState["markSheets"],
  className: string,
  studentId: string
) {
  return sheets.map((sheet) => {
    if (sheet.className !== className || sheet.status !== "Draft") return sheet
    if (sheet.entries.some((entry) => entry.studentId === studentId))
      return sheet
    return { ...sheet, entries: [...sheet.entries, { studentId, score: null }] }
  })
}

function billedToward(
  state: SchoolState,
  studentId: string,
  period: string,
  feeType: string
) {
  return state.charges
    .filter(
      (item) =>
        item.studentId === studentId &&
        item.period === period &&
        item.type === feeType
    )
    .reduce((total, item) => total + item.amount, 0)
}

function paidToward(
  state: SchoolState,
  studentId: string,
  period: string,
  feeType: string
) {
  return state.receipts
    .filter(
      (item) =>
        item.studentId === studentId &&
        item.period === period &&
        item.type === feeType
    )
    .reduce((total, item) => total + item.amount, 0)
}

function isSettled(
  state: SchoolState,
  studentId: string,
  period: string,
  feeType: string
) {
  const billed = billedToward(state, studentId, period, feeType)
  if (billed <= 0) return false
  return paidToward(state, studentId, period, feeType) >= billed
}

function validMoney(amount: number) {
  return (
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= 1_000_000 &&
    Math.round(amount * 100) === amount * 100
  )
}

function ageOn(dobIso: string, onIso: string) {
  const dob = new Date(`${dobIso}T12:00:00Z`)
  const on = new Date(`${onIso}T12:00:00Z`)
  if (Number.isNaN(dob.getTime()) || Number.isNaN(on.getTime())) return null
  let age = on.getUTCFullYear() - dob.getUTCFullYear()
  const month = on.getUTCMonth() - dob.getUTCMonth()
  if (month < 0 || (month === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1
  return age
}

function audit(state: SchoolState, actor: string, action: string): SchoolState {
  const auditNumber = state.counters.audit + 1
  return {
    ...state,
    counters: { ...state.counters, audit: auditNumber },
    audit: [
      { id: `AUD-${auditNumber}`, actor, action, at: new Date().toISOString() },
      ...state.audit,
    ],
  }
}

function ok(
  state: SchoolState,
  message: string
): { state: SchoolState; result: ActionResult } {
  return { state, result: { ok: true, message } }
}

function fail(
  state: SchoolState,
  error: string
): { state: SchoolState; result: ActionResult } {
  return { state, result: { ok: false, error } }
}
