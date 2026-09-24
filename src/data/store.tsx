/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { createSeed } from "@/data/seed"
import type {
  Application,
  AttendanceStatus,
  ClassSection,
  Expense,
  LessonStatus,
  MarkRow,
  Payment,
  SchoolState,
  SchoolUpdate,
  SheetStatus,
  Staff,
  Student,
  Subject,
  TimetableSlot,
  UpdateStatus,
} from "@/data/types"

const STORAGE_KEY = "eduvia-demo-v1"

type PaymentInput = Omit<Payment, "status" | "date"> & { date?: string }
type ApplicationInput = Omit<Application, "id" | "status" | "submittedOn">
type SyncReport = { imported: number; skipped: number; failed: number; notes: string[] }

type SchoolContextValue = {
  state: SchoolState
  addApplication: (input: ApplicationInput, actor: string) => string | null
  setApplicationStatus: (id: string, status: Application["status"], actor: string) => string | null
  updateStudent: (id: string, patch: Partial<Pick<Student, "status" | "classId" | "phone" | "guardian">>, actor: string) => void
  addPayment: (input: PaymentInput, actor: string) => string | null
  setPaymentStatus: (ref: string, status: Payment["status"], actor: string) => void
  importWorkbook: (fileName: string, actor: string) => SyncReport | string
  addExpense: (input: Omit<Expense, "id">, actor: string) => string | null
  addClass: (input: Omit<ClassSection, "id" | "label">, actor: string) => string | null
  addSubject: (input: Omit<Subject, "id">, actor: string) => string | null
  addSlot: (input: Omit<TimetableSlot, "id">, actor: string) => string | null
  removeSlot: (id: string, actor: string) => void
  addStaff: (input: Omit<Staff, "id">, actor: string) => string | null
  saveAttendance: (classId: string, date: string, rows: { studentId: string; status: AttendanceStatus }[], actor: string) => void
  updateLesson: (id: string, patch: { progress: number; status: LessonStatus }, actor: string) => void
  addUpdate: (input: Omit<SchoolUpdate, "id" | "status" | "author"> & { author: string }) => string | null
  setUpdateStatus: (id: string, status: UpdateStatus, actor: string) => void
  saveScores: (sheetId: string, rows: MarkRow[], actor: string) => string | null
  setSheetStatus: (sheetId: string, status: SheetStatus, actor: string) => string | null
  resetDemo: () => void
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

function loadState(): SchoolState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeed()
    const parsed = JSON.parse(raw) as SchoolState
    if (!parsed.students?.length || !parsed.sheets || !parsed.attendance) return createSeed()
    return parsed
  } catch {
    return createSeed()
  }
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SchoolState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const audit = useCallback((actor: string, action: string) => {
    setState((current) => ({
      ...current,
      audits: [{ id: uid("au"), actor, action, at: new Date().toISOString() }, ...current.audits].slice(0, 40),
    }))
  }, [])

  const addApplication = useCallback((input: ApplicationInput, actor: string) => {
    if (!input.name.trim() || !input.guardian.trim() || !input.dob || !input.phone.trim()) {
      return "Name, date of birth, guardian and phone are required."
    }
    const application: Application = {
      ...input,
      name: input.name.trim(),
      guardian: input.guardian.trim(),
      id: `APP-${1045 + Math.floor(Math.random() * 400)}`,
      status: "New",
      submittedOn: new Date().toISOString().slice(0, 10),
    }
    setState((current) => ({ ...current, applications: [application, ...current.applications] }))
    audit(actor, `Created admission application for ${application.name}`)
    return null
  }, [audit])

  const setApplicationStatus = useCallback((id: string, status: Application["status"], actor: string) => {
    let error: string | null = null
    setState((current) => {
      const application = current.applications.find((item) => item.id === id)
      if (!application) {
        error = "Application was not found."
        return current
      }
      let students = current.students
      if (status === "Enrolled") {
        const exists = students.some((student) => student.name.toLowerCase() === application.name.toLowerCase() && student.classId === application.classId)
        if (!exists) {
          const student: Student = {
            id: `CLS-${24000 + students.length + 1}`,
            name: application.name,
            classId: application.classId,
            guardian: application.guardian,
            phone: application.phone,
            status: "Active",
            dob: application.dob,
            gender: "Female",
            admittedOn: new Date().toISOString().slice(0, 10),
          }
          students = [student, ...students]
        }
      }
      return {
        ...current,
        students,
        applications: current.applications.map((item) => (item.id === id ? { ...item, status } : item)),
      }
    })
    if (!error) audit(actor, `Marked application ${id} as ${status}`)
    return error
  }, [audit])

  const updateStudent = useCallback((id: string, patch: Partial<Pick<Student, "status" | "classId" | "phone" | "guardian">>, actor: string) => {
    setState((current) => ({
      ...current,
      students: current.students.map((student) => (student.id === id ? { ...student, ...patch } : student)),
    }))
    const detail = patch.status ? `status to ${patch.status}` : "record"
    audit(actor, `Updated student ${id} ${detail}`)
  }, [audit])

  const addPayment = useCallback((input: PaymentInput, actor: string) => {
    if (!input.studentId) return "Choose a student."
    if (!input.ref.trim()) return "Receipt reference is required."
    if (!Number.isFinite(input.amount) || input.amount <= 0) return "Amount must be greater than zero."
    let error: string | null = null
    setState((current) => {
      if (current.payments.some((payment) => payment.ref.toLowerCase() === input.ref.trim().toLowerCase())) {
        error = "That receipt reference already exists. Duplicate payments are blocked."
        return current
      }
      const payment: Payment = {
        ...input,
        ref: input.ref.trim(),
        status: "Paid",
        date: input.date ?? new Date().toISOString().slice(0, 10),
      }
      return { ...current, payments: [payment, ...current.payments] }
    })
    if (!error) audit(actor, `Recorded payment ${input.ref.trim()}`)
    return error
  }, [audit])

  const setPaymentStatus = useCallback((ref: string, status: Payment["status"], actor: string) => {
    setState((current) => ({
      ...current,
      payments: current.payments.map((payment) => (payment.ref === ref ? { ...payment, status } : payment)),
    }))
    audit(actor, `Marked ${ref} as ${status}`)
  }, [audit])

  const importWorkbook = useCallback((fileName: string, actor: string) => {
    if (!fileName) return "Choose the controlled .xlsx template first."
    let report: SyncReport = { imported: 0, skipped: 0, failed: 0, notes: [] }
    setState((current) => {
      const duplicate = current.payments[0]
      const candidates = current.students.filter((student) => student.status === "Active").slice(0, 3)
      const notes: string[] = []
      let imported = 0
      let skipped = 0
      let failed = 0
      const next = [...current.payments]
      if (duplicate) {
        skipped += 1
        notes.push(`Skipped duplicate ${duplicate.ref}`)
      }
      candidates.forEach((student, index) => {
        if (fileName.toLowerCase().includes("bad") && index === 0) {
          failed += 1
          notes.push(`Failed ${student.id}: amount missing`)
          return
        }
        const ref = `RCPT-SYNC-${Date.now().toString().slice(-6)}-${index + 1}`
        next.unshift({
          ref,
          studentId: student.id,
          period: "September 2026",
          type: "Tuition",
          amount: 8500,
          method: "Offline import",
          status: "Paid",
          date: new Date().toISOString().slice(0, 10),
        })
        imported += 1
      })
      failed += 1
      notes.push("Failed row 19: unknown student CLS-00000")
      report = { imported, skipped, failed, notes }
      return {
        ...current,
        payments: next,
        syncLogs: [{ id: uid("sy"), fileName, ...report, at: new Date().toISOString() }, ...current.syncLogs],
      }
    })
    audit(actor, `Imported ${report.imported} offline fee rows from ${fileName}`)
    return report
  }, [audit])

  const addExpense = useCallback((input: Omit<Expense, "id">, actor: string) => {
    if (!input.title.trim() || input.amount <= 0) return "Title and a positive amount are required."
    setState((current) => ({
      ...current,
      expenses: [{ ...input, title: input.title.trim(), id: uid("EX") }, ...current.expenses],
    }))
    audit(actor, `Posted expense ${input.title.trim()}`)
    return null
  }, [audit])

  const addClass = useCallback((input: Omit<ClassSection, "id" | "label">, actor: string) => {
    if (!input.grade.trim() || !input.section.trim()) return "Grade and section are required."
    const label = `${input.grade.trim()} · ${input.section.trim()}`
    let error: string | null = null
    setState((current) => {
      if (current.classes.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
        error = "That class section already exists."
        return current
      }
      return {
        ...current,
        classes: [...current.classes, { id: uid("cl"), label, grade: input.grade.trim(), section: input.section.trim(), room: input.room.trim() || "Unassigned" }],
      }
    })
    if (!error) audit(actor, `Added class ${label}`)
    return error
  }, [audit])

  const addSubject = useCallback((input: Omit<Subject, "id">, actor: string) => {
    if (!input.name.trim() || !input.code.trim()) return "Subject name and code are required."
    let error: string | null = null
    setState((current) => {
      if (current.subjects.some((item) => item.code.toLowerCase() === input.code.trim().toLowerCase())) {
        error = "Subject code must be unique."
        return current
      }
      return { ...current, subjects: [...current.subjects, { id: uid("sub"), name: input.name.trim(), code: input.code.trim().toUpperCase() }] }
    })
    if (!error) audit(actor, `Added subject ${input.name.trim()}`)
    return error
  }, [audit])

  const addSlot = useCallback((input: Omit<TimetableSlot, "id">, actor: string) => {
    let error: string | null = null
    setState((current) => {
      const clash = current.slots.find((slot) => slot.day === input.day && slot.time === input.time && (slot.classId === input.classId || slot.teacher === input.teacher || slot.room === input.room))
      if (clash) {
        error = "That period clashes with an existing class, teacher or room."
        return current
      }
      return { ...current, slots: [...current.slots, { ...input, id: uid("tt") }] }
    })
    if (!error) audit(actor, `Scheduled ${input.subject} on ${input.day} ${input.time}`)
    return error
  }, [audit])

  const removeSlot = useCallback((id: string, actor: string) => {
    setState((current) => ({ ...current, slots: current.slots.filter((slot) => slot.id !== id) }))
    audit(actor, "Removed a timetable period")
  }, [audit])

  const addStaff = useCallback((input: Omit<Staff, "id">, actor: string) => {
    if (!input.name.trim() || !input.email.trim()) return "Name and email are required."
    setState((current) => ({
      ...current,
      staff: [...current.staff, { ...input, name: input.name.trim(), email: input.email.trim(), id: uid("st") }],
    }))
    audit(actor, `Added staff member ${input.name.trim()}`)
    return null
  }, [audit])

  const saveAttendance = useCallback((classId: string, date: string, rows: { studentId: string; status: AttendanceStatus }[], actor: string) => {
    setState((current) => {
      const rest = current.attendance.filter((mark) => !(mark.classId === classId && mark.date === date && rows.some((row) => row.studentId === mark.studentId)))
      const next = rows.map((row) => ({ ...row, classId, date }))
      return { ...current, attendance: [...next, ...rest] }
    })
    audit(actor, `Saved attendance for ${date}`)
  }, [audit])

  const updateLesson = useCallback((id: string, patch: { progress: number; status: LessonStatus }, actor: string) => {
    setState((current) => ({
      ...current,
      lessons: current.lessons.map((lesson) => (lesson.id === id ? { ...lesson, progress: patch.progress, status: patch.status } : lesson)),
    }))
    audit(actor, "Updated lesson progress")
  }, [audit])

  const addUpdate = useCallback((input: Omit<SchoolUpdate, "id" | "status" | "author"> & { author: string }) => {
    if (!input.text.trim()) return "Write the update before submitting."
    const item: SchoolUpdate = { ...input, text: input.text.trim(), id: uid("up"), status: "Draft" }
    setState((current) => ({ ...current, updates: [item, ...current.updates] }))
    audit(input.author, `Drafted a ${input.kind.toLowerCase()} update`)
    return null
  }, [audit])

  const setUpdateStatus = useCallback((id: string, status: UpdateStatus, actor: string) => {
    setState((current) => ({
      ...current,
      updates: current.updates.map((item) => (item.id === id ? { ...item, status } : item)),
    }))
    audit(actor, `Marked an update as ${status}`)
  }, [audit])

  const saveScores = useCallback((sheetId: string, rows: MarkRow[], actor: string) => {
    let error: string | null = null
    setState((current) => {
      const target = current.sheets.find((sheet) => sheet.id === sheetId)
      if (!target) {
        error = "Mark sheet was not found."
        return current
      }
      if (target.status !== "Draft") {
        error = "This sheet is locked. Ask management to reopen it."
        return current
      }
      if (rows.some((row) => row.score !== null && (row.score < 0 || row.score > target.max))) {
        error = `Scores must be between 0 and ${target.max}.`
        return current
      }
      return {
        ...current,
        sheets: current.sheets.map((sheet) => (sheet.id === sheetId ? { ...sheet, rows } : sheet)),
      }
    })
    if (!error) audit(actor, "Saved draft marks")
    return error
  }, [audit])

  const setSheetStatus = useCallback((sheetId: string, status: SheetStatus, actor: string) => {
    let error: string | null = null
    setState((current) => {
      const target = current.sheets.find((sheet) => sheet.id === sheetId)
      if (!target) {
        error = "Mark sheet was not found."
        return current
      }
      if ((status === "Submitted" || status === "Verified" || status === "Published") && target.rows.some((row) => row.score === null)) {
        error = "Enter every score before moving this sheet forward."
        return current
      }
      const allowed: Record<SheetStatus, SheetStatus[]> = {
        Draft: ["Submitted"],
        Submitted: ["Verified", "Draft"],
        Verified: ["Published", "Draft"],
        Published: ["Draft"],
      }
      if (!allowed[target.status].includes(status) && status !== target.status) {
        error = `Cannot move a ${target.status.toLowerCase()} sheet to ${status.toLowerCase()}.`
        return current
      }
      return {
        ...current,
        sheets: current.sheets.map((sheet) => (sheet.id === sheetId ? { ...sheet, status } : sheet)),
      }
    })
    if (!error) audit(actor, `Moved a mark sheet to ${status}`)
    return error
  }, [audit])

  const resetDemo = useCallback(() => {
    const fresh = createSeed()
    localStorage.removeItem(STORAGE_KEY)
    setState(fresh)
  }, [])

  const value = useMemo<SchoolContextValue>(() => ({
    state,
    addApplication,
    setApplicationStatus,
    updateStudent,
    addPayment,
    setPaymentStatus,
    importWorkbook,
    addExpense,
    addClass,
    addSubject,
    addSlot,
    removeSlot,
    addStaff,
    saveAttendance,
    updateLesson,
    addUpdate,
    setUpdateStatus,
    saveScores,
    setSheetStatus,
    resetDemo,
  }), [state, addApplication, setApplicationStatus, updateStudent, addPayment, setPaymentStatus, importWorkbook, addExpense, addClass, addSubject, addSlot, removeSlot, addStaff, saveAttendance, updateLesson, addUpdate, setUpdateStatus, saveScores, setSheetStatus, resetDemo])

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
}

export function useSchool() {
  const context = useContext(SchoolContext)
  if (!context) throw new Error("useSchool must be used within SchoolProvider")
  return context
}

export function studentName(students: Student[], id: string) {
  return students.find((student) => student.id === id)?.name ?? id
}
