/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  fetchBackendState,
  fetchSchoolDataSlices,
} from "@/data/backend-sync"
import {
  ADMISSION_WIZARD_SLICES,
  resolvePortalSyncPlan,
} from "@/data/portal-sync"
import { portalSyncKey, runPortalSyncOnce } from "@/data/portal-sync-flight"
import {
  type AcademicSession,
  type Application,
  type AttendanceStatus,
  type ClassSection,
  DEFAULT_SETTINGS,
  type FeeMonth,
  type MarkRow,
  type Payment,
  type PlannedChapter,
  type ReviewStatus,
  type SchoolSettings,
  type SchoolState,
  type SchoolUpdate,
  type SheetStatus,
  type Staff,
  type Student,
  type Subject,
  type TeacherAbsence,
  type TestSchedule,
  type UpdateStatus,
} from "@/data/types"
import {
  busyReason,
  datesOnWeekday,
  monthlySummaries,
  weekdayOf,
  weekOfMonth,
} from "@/lib/academics"
import type { Actor } from "@/lib/actor"
import { api, ApiHttpError } from "@/lib/api"
import {
  createApplicationDraft,
  decideApplication,
  enrollApplication,
  patchApplication,
  reviewApplication,
  submitApplication,
  toApplicationApiBody,
} from "@/lib/applications-api"
import { loadAuth,type Role } from "@/lib/auth"
import { getToday } from "@/lib/dates"
import {
  allocateOldestFirst,
  applyLines,
  monthLabel,
  validateManualPlan,
} from "@/lib/fees"
import {
  invalidateAdmissionDetail,
  invalidateAdmissionsLists,
} from "@/lib/invalidate-admissions"
import { can, type Permission, ROLE_LABELS } from "@/lib/permissions"

const LEGACY_KEYS = ["eduvia-demo-v4", "eduvia-demo-v5"]

type ApplicationInput = Omit<Application, "id" | "status" | "submittedOn">
type Result = string | null

export type RecordPaymentInput = {
  studentId: string
  amount: number
  method: string
  date?: string
  note?: string
  /** Generated once per form; a re-submit with the same key returns the original receipt. */
  idempotencyKey: string
  /** Explicit allocation (super admin only). Omit for oldest-unpaid-first. */
  allocations?: { feeMonthId: string; amount: number }[]
}

type SchoolContextValue = {
  state: SchoolState
  syncPortalForRoute: (role: Role, section: string) => Promise<void>
  ensureAdmissionWizardData: () => Promise<void>
  addApplication: (
    input: ApplicationInput,
    actor: string
  ) => { id: string } | { error: string }
  persistApplicationDraft: (
    input: Partial<ApplicationInput> & { email?: string },
    actor: string
  ) => Promise<{ id: string } | { error: string }>
  patchApplicationRecord: (
    id: string,
    input: Partial<ApplicationInput> & {
      email?: string
      decision?: Application["decision"]
    },
    actor: string
  ) => Promise<Result>
  finalizeApplication: (
    id: string,
    input: {
      decision: Application["decision"]
      remarks?: string
      payload: Partial<ApplicationInput> & { email?: string }
    },
    actor: string
  ) => Promise<Result>
  setApplicationStatus: (
    id: string,
    status: Application["status"],
    actor: string
  ) => Promise<Result>
  updateStudent: (
    id: string,
    patch: Partial<Pick<Student, "status" | "classId" | "phone" | "guardian">>,
    actor: string
  ) => void
  addSession: (
    input: Omit<AcademicSession, "id" | "current">,
    actor: string
  ) => Result
  activateSession: (id: string, actor: string) => Result
  addClass: (input: Omit<ClassSection, "id" | "label">, actor: string) => Result
  addSubject: (input: Omit<Subject, "id">, actor: string) => Result
  addStaff: (
    input: Pick<
      Staff,
      "name" | "role" | "email" | "phone" | "subject" | "classIds"
    >,
    actor: Actor
  ) => Result
  saveAttendance: (
    classId: string,
    date: string,
    rows: { studentId: string; status: AttendanceStatus }[],
    actor: string
  ) => Promise<void>
  addUpdate: (
    input: Omit<SchoolUpdate, "id" | "status" | "author"> & { author: string }
  ) => Result
  setUpdateStatus: (id: string, status: UpdateStatus, actor: string) => void
  saveScores: (sheetId: string, rows: MarkRow[], actor: string) => Result
  setSheetStatus: (
    sheetId: string,
    status: SheetStatus,
    actor: string
  ) => Result
  setClassPeriodCount: (
    classId: string,
    periodCount: number,
    actor: string
  ) => Result
  // fees (UR-08 / UR-09)
  recordPayment: (
    input: RecordPaymentInput,
    actor: Actor
  ) => { payment: Payment; duplicate: boolean } | { error: string }
  confirmPayment: (ref: string, actor: Actor) => Result
  // teachers (UR-02) and substitutes (UR-03)
  changeTeacherSubject: (
    staffId: string,
    subject: string,
    reason: string,
    actor: Actor
  ) => Result
  markTeacherAbsent: (
    input: {
      teacherId: string
      date: string
      periods: number[]
      notes: string
    },
    actor: Actor
  ) => Result
  assignSubstitute: (
    absenceId: string,
    substituteId: string,
    actor: Actor
  ) => Result
  removeSubstitute: (absenceId: string, actor: Actor) => Result
  cancelAbsence: (absenceId: string, actor: Actor) => Result
  // planned chapters + daily updates (UR-04)
  addPlannedChapter: (
    input: Pick<
      PlannedChapter,
      "classId" | "subject" | "title" | "description" | "targetDate"
    >,
    actor: Actor
  ) => Result
  removePlannedChapter: (id: string, actor: Actor) => Result
  submitDailyLesson: (
    input: {
      classId: string
      date: string
      chapterId: string
      classwork: string
      homework: string
      remarks: string
    },
    actor: Actor
  ) => Result
  reviewDailyLesson: (
    id: string,
    decision: Exclude<ReviewStatus, "Submitted">,
    note: string,
    actor: Actor
  ) => Result
  // weekly tests (UR-05 / UR-06)
  saveTestSchedule: (
    input: Omit<TestSchedule, "id" | "active">,
    actor: Actor
  ) => Promise<Result>
  removeTestSchedule: (id: string, actor: Actor) => Promise<Result>
  generateMonthTests: (month: string, actor: Actor) => Result
  saveWeeklyMarks: (
    testId: string,
    results: { studentId: string; score: number | null }[],
    actor: Actor
  ) => Result
  publishWeeklyTest: (testId: string, actor: Actor) => Result
  // results (UR-07) and settings
  grantResultOverride: (
    examId: string,
    studentId: string,
    reason: string,
    actor: Actor
  ) => Result
  revokeResultOverride: (overrideId: string, actor: Actor) => Result
  /** Persists settings via API first; local state updates only after success. */
  updateSettings: (
    patch: Partial<SchoolSettings>,
    actor: Actor
  ) => Promise<Result>
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

function emptyState(): SchoolState {
  return {
    sessions: [],
    classes: [],
    subjects: [],
    staff: [],
    students: [],
    applications: [],
    feeMonths: [],
    payments: [],
    expenses: [],
    sheets: [],
    resultOverrides: [],
    attendance: [],
    plannedChapters: [],
    dailyLessons: [],
    updates: [],
    slots: [],
    audits: [],
    syncLogs: [],
    teacherAbsences: [],
    substitutions: [],
    testSchedules: [],
    weeklyTests: [],
    settings: DEFAULT_SETTINGS,
  }
}

function loadState(): SchoolState {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
  return emptyState()
}

function signedInTeacher(state: SchoolState) {
  const email = loadAuth()?.user?.email
  return state.staff.find(
    (person) => person.role === "Teacher" && person.email === email
  )
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`
}

function withAudit(
  state: SchoolState,
  actor: string,
  action: string,
  entity?: string
): SchoolState {
  return {
    ...state,
    audits: [
      { id: uid("au"), actor, action, at: new Date().toISOString(), entity },
      ...state.audits,
    ].slice(0, 60),
  }
}

/** Server-side style guard: the demo store refuses what the API would refuse (BR-14). */
function denied(actor: Actor, permission: Permission) {
  return can(actor.role, permission)
    ? null
    : `${ROLE_LABELS[actor.role]} is not allowed to do this.`
}

function staffName(state: SchoolState, id: string) {
  return state.staff.find((person) => person.id === id)?.name ?? id
}

function studentLabel(state: SchoolState, id: string) {
  return state.students.find((student) => student.id === id)?.name ?? id
}

function classFee(state: SchoolState, classId: string) {
  return state.classes.find((klass) => klass.id === classId)?.monthlyFee ?? 8500
}

function receiptNo(state: SchoolState, date: string) {
  const prefix = `RCPT-${date.replace(/-/g, "")}-`
  const used = state.payments.filter((payment) =>
    payment.ref.startsWith(prefix)
  ).length
  return `${prefix}${String(used + 1).padStart(3, "0")}`
}

/** Allocates a confirmed payment to the student's ledger (oldest first, or explicit lines). */
function allocate(
  state: SchoolState,
  payment: Payment,
  manual?: { feeMonthId: string; amount: number }[]
) {
  const student = state.students.find(
    (item) => item.id === payment.studentId
  ) as Student
  const ledger = state.feeMonths.filter(
    (month) => month.studentId === student.id
  )
  let months: FeeMonth[]
  let lines
  let leftover
  if (manual?.length) {
    const plan = validateManualPlan(ledger, payment.amount, manual)
    if ("error" in plan) return { error: plan.error }
    months = applyLines(ledger, plan.lines)
    lines = plan.lines
    leftover = plan.leftover
  } else {
    const plan = allocateOldestFirst(ledger, {
      studentId: student.id,
      amount: payment.amount,
      monthlyFee: classFee(state, student.classId),
      currentMonth: payment.date.slice(0, 7),
      newId: (month) => `fm-${student.id}-${month}`,
    })
    months = plan.months
    lines = plan.lines
    leftover = plan.leftover
  }
  const allocated: Payment = {
    ...payment,
    status: "Paid",
    allocations: lines,
    unallocated: leftover,
    mode: manual?.length ? "manual" : "auto",
  }
  const next: SchoolState = {
    ...state,
    feeMonths: [
      ...state.feeMonths.filter((month) => month.studentId !== student.id),
      ...months,
    ],
    payments: [
      allocated,
      ...state.payments.filter((item) => item.ref !== payment.ref),
    ],
  }
  const covered =
    lines.map((line) => monthLabel(line.month)).join(", ") || "no month"
  return {
    next: withAudit(
      next,
      payment.recordedBy,
      `Allocated ${payment.ref} for ${student.name} (${manual?.length ? "manual" : "oldest first"}) to ${covered}`,
      "fee_payment"
    ),
    payment: allocated,
  }
}

/** Recomputes the month for one class + subject and audits every Failed outcome (BR-08). */
function auditOutcomes(
  state: SchoolState,
  classId: string,
  subject: string,
  month: string
) {
  const rows = monthlySummaries(
    state.weeklyTests.filter((test) => test.subject === subject),
    month,
    state.settings.dailyTestRules,
    { classId }
  )
  return rows
    .filter((row) => row.flaggedForFollowUp)
    .reduce(
      (next, row) =>
        withAudit(
          next,
          "System",
          `${studentLabel(state, row.studentId)} flagged: Failed ${subject} for ${monthLabel(month)} (${row.failedCount} failed weekly tests)`,
          "daily_test"
        ),
      state
    )
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SchoolState>(loadState)
  const stateRef = useRef(state)

  const syncBackend = useCallback(async () => {
    try {
      const auth = loadAuth()
      if (auth?.token) {
        const fresh = await fetchBackendState()
        stateRef.current = fresh
        setState(fresh)
      }
    } catch (err) {
      console.warn("Backend sync failed:", err)
    }
  }, [])

  /** Runs a pure transition against the latest state and commits it synchronously. */
  const commit = useCallback(
    <T,>(
      run: (current: SchoolState) => {
        next?: SchoolState
        error?: string
        value?: T
      }
    ) => {
      const outcome = run(stateRef.current)
      if (outcome.next && !outcome.error) {
        stateRef.current = outcome.next
        setState(outcome.next)
      }
      return outcome
    },
    []
  )

  const simple = useCallback(
    (
      run: (current: SchoolState) => { next?: SchoolState; error?: string }
    ): Result => commit(run).error ?? null,
    [commit]
  )

  const syncPortalForRoute = useCallback(
    async (role: Role, section: string) => {
      if (!loadAuth()?.token) return
      const plan = resolvePortalSyncPlan(role, section)
      const key = portalSyncKey(role, section, plan)
      await runPortalSyncOnce(key, async () => {
        try {
          if (plan.mode === "full") {
            await syncBackend()
            return
          }
          const partial = await fetchSchoolDataSlices(plan.slices)
          commit((current) => ({
            next: { ...current, ...partial },
          }))
        } catch (err) {
          console.warn("Portal sync failed:", err)
        }
      })
    },
    [commit, syncBackend]
  )

  const ensureAdmissionWizardData = useCallback(async () => {
    if (!loadAuth()?.token) return
    const key = `admission-wizard:${ADMISSION_WIZARD_SLICES.join(",")}`
    await runPortalSyncOnce(key, async () => {
      try {
        const partial = await fetchSchoolDataSlices(ADMISSION_WIZARD_SLICES)
        commit((current) => ({
          next: { ...current, ...partial },
        }))
      } catch (err) {
        console.warn("Admission wizard data load failed:", err)
      }
    })
  }, [commit])

  const persistApplicationDraft = useCallback(
    async (
      input: Partial<ApplicationInput> & { email?: string },
      actor: string
    ) => {
      if (!loadAuth()?.token) {
        return { error: "Sign in to save admission applications." }
      }
      try {
        const id = await createApplicationDraft(toApplicationApiBody(input))
        await invalidateAdmissionsLists()
        commit((current) => ({
          next: withAudit(
            current,
            actor,
            `Started admission draft ${id}`
          ),
        }))
        return { id }
      } catch (err) {
        const message =
          err instanceof ApiHttpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not save draft."
        return { error: message }
      }
    },
    [commit]
  )

  const patchApplicationRecord = useCallback(
    async (
      id: string,
      input: Partial<ApplicationInput> & {
        email?: string
        decision?: Application["decision"]
      },
      actor: string
    ) => {
      if (!loadAuth()?.token) {
        return "Sign in to update applications."
      }
      try {
        await patchApplication(id, toApplicationApiBody(input))
        await invalidateAdmissionsLists()
        await invalidateAdmissionDetail(id)
        commit((current) => ({
          next: withAudit(current, actor, `Updated application ${id}`),
        }))
        return null
      } catch (err) {
        const message =
          err instanceof ApiHttpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not update application."
        return message
      }
    },
    [commit]
  )

  const finalizeApplication = useCallback(
    async (
      id: string,
      input: {
        decision: Application["decision"]
        remarks?: string
        payload: Partial<ApplicationInput> & { email?: string }
      },
      actor: string
    ) => {
      if (!loadAuth()?.token) {
        return "Sign in to submit applications."
      }
      if (!input.decision) {
        return "Choose Admit, Reject, or Waitlist before submitting."
      }
      try {
        await patchApplication(
          id,
          toApplicationApiBody({
            ...input.payload,
            decision: input.decision,
            notes: input.remarks,
          })
        )
        await submitApplication(id)
        await decideApplication(
          id,
          input.decision as "Admit" | "Reject" | "Waitlist",
          input.remarks
        )
        if (input.decision === "Admit") {
          await enrollApplication(id)
        }
        await syncBackend()
        await invalidateAdmissionsLists()
        await invalidateAdmissionDetail(id)
        commit((current) => ({
          next: withAudit(
            current,
            actor,
            `Submitted application ${id} (${input.decision})`
          ),
        }))
        return null
      } catch (err) {
        const message =
          err instanceof ApiHttpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Submission failed."
        return message
      }
    },
    [commit, syncBackend]
  )

  const addApplication = useCallback(
    (input: ApplicationInput, _actor: string) => {
      if (
        !input.name.trim() ||
        !input.guardian.trim() ||
        !input.dob ||
        !input.phone.trim()
      ) {
        return {
          error: "Name, date of birth, guardian and phone are required.",
        }
      }
      if (loadAuth()?.token) {
        void (async () => {
          try {
            const rawClassId = Number(input.classId)
            await api.post("/applications", {
              ...toApplicationApiBody(input),
              fkClassId:
                Number.isFinite(rawClassId) && rawClassId > 0
                  ? rawClassId
                  : undefined,
            })
            await invalidateAdmissionsLists()
          } catch (err) {
            console.error(err)
          }
        })()
        return { id: "pending" }
      }
      return { error: "Sign in to create applications." }
    },
    []
  )

  const setApplicationStatus = useCallback(
    async (id: string, status: Application["status"], actor: string) => {
      const application = state.applications.find((item) => item.id === id)
      if (!loadAuth()?.token) {
        return "Sign in to update application status."
      }
      try {
        if (status === "Review") {
          await reviewApplication(id)
        } else if (status === "Waitlist") {
          await decideApplication(id, "Waitlist")
        } else if (status === "Rejected") {
          await decideApplication(id, "Reject")
        } else if (status === "Enrolled") {
          if (application?.decision !== "Admit") {
            await decideApplication(id, "Admit")
          }
          await enrollApplication(id)
        } else {
          return "Unsupported status change."
        }
        if (status === "Enrolled") {
          await syncBackend()
        }
        await invalidateAdmissionsLists()
        await invalidateAdmissionDetail(id)
        commit((current) => ({
          next: withAudit(
            current,
            actor,
            `Marked application ${id} as ${status}`
          ),
        }))
        return null
      } catch (err) {
        const message =
          err instanceof ApiHttpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not update status."
        return message
      }
    },
    [commit, state.applications, syncBackend]
  )

  const updateStudent = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<Student, "status" | "classId" | "phone" | "guardian">
      >,
      actor: string
    ) => {
      simple((current) => {
        const numId = Number(id.replace(/^CLS-/, ""))
        if (Number.isFinite(numId)) {
          api
            .patch(`/students/${numId}`, patch)
            .then(syncBackend)
            .catch(console.error)
        }
        return {
          next: withAudit(
            {
              ...current,
              students: current.students.map((student) =>
                student.id === id ? { ...student, ...patch } : student
              ),
            },
            actor,
            `Updated student ${id} ${patch.status ? `status to ${patch.status}` : "record"}`
          ),
        }
      })
    },
    [simple, syncBackend]
  )

  // ---- fees ------------------------------------------------------------------

  const recordPayment = useCallback(
    (input: RecordPaymentInput, actor: Actor) => {
      const outcome = commit<{ payment: Payment; duplicate: boolean }>(
        (current) => {
          const blocked = denied(actor, "fees.payments.record")
          if (blocked) return { error: blocked }
          const existing = current.payments.find(
            (payment) => payment.idempotencyKey === input.idempotencyKey
          )
          if (existing) {
            return {
              next: withAudit(
                current,
                "System",
                `Blocked duplicate submission of ${existing.ref}`,
                "fee_payment"
              ),
              value: { payment: existing, duplicate: true },
            }
          }
          if (input.allocations?.length) {
            const manual = denied(actor, "fees.payments.allocate_manual")
            if (manual)
              return {
                error:
                  "Only the super admin can record an explicit allocation.",
              }
          }
          const student = current.students.find(
            (item) =>
              item.id === input.studentId ||
              item.admissionNo === input.studentId
          )
          if (!student) return { error: "Choose a student." }
          if (!Number.isFinite(input.amount) || input.amount <= 0)
            return { error: "Amount must be greater than zero." }
          const date = input.date || getToday()
          const payment: Payment = {
            ref: receiptNo(current, date),
            studentId: student.id,
            amount: Math.round(input.amount),
            method: input.method || "Cash",
            status: "Paid",
            date,
            recordedBy: actor.name,
            recordedByRole: actor.role,
            allocations: [],
            unallocated: 0,
            mode: "auto",
            idempotencyKey: input.idempotencyKey,
            note: input.note?.trim() || undefined,
          }
          const result = allocate(current, payment, input.allocations)
          if ("error" in result) return { error: result.error }

          const rawStudentId = Number(student.id)
          if (Number.isFinite(rawStudentId)) {
            api
              .post("/fees/payments", {
                studentId: rawStudentId,
                amount: Math.round(input.amount),
                paidOn: date,
                method: input.method || "Cash",
                feeType: "Tuition",
                notes: input.note?.trim() || null,
                idempotencyKey: input.idempotencyKey,
                allocations: input.allocations?.map((a) => ({
                  feeMonthId: Number(
                    a.feeMonthId.replace(/^fm-/, "").split("-").pop() ||
                      a.feeMonthId
                  ),
                  amount: a.amount,
                })),
              })
              .then(syncBackend)
              .catch(console.error)
          }

          return {
            next: result.next,
            value: { payment: result.payment, duplicate: false },
          }
        }
      )
      return outcome.error
        ? { error: outcome.error }
        : (outcome.value as { payment: Payment; duplicate: boolean })
    },
    [commit, syncBackend]
  )

  const confirmPayment = useCallback(
    (ref: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "fees.payments.confirm")
        if (blocked) return { error: blocked }
        const payment = current.payments.find((item) => item.ref === ref)
        if (!payment) return { error: "Payment not found." }
        if (payment.status === "Paid")
          return { error: "Payment is already confirmed." }
        const result = allocate(
          current,
          { ...payment, recordedBy: actor.name, recordedByRole: actor.role },
          undefined
        )
        if ("error" in result) return { error: result.error }
        return { next: result.next }
      }),
    [simple]
  )


  // ---- academic setup ----------------------------------------------------------

  const addSession = useCallback(
    (input: Omit<AcademicSession, "id" | "current">, actor: string) =>
      simple((current) => {
        if (!input.name.trim() || !input.start || !input.end)
          return {
            error: "Session name, start date and end date are required.",
          }
        if (input.end < input.start)
          return { error: "End date must be after the start date." }
        if (
          current.sessions.some(
            (item) =>
              item.name.toLowerCase() === input.name.trim().toLowerCase()
          )
        )
          return { error: "A session with that name already exists." }

        api
          .post("/sessions", {
            name: input.name.trim(),
            startDate: input.start,
            endDate: input.end,
          })
          .then(syncBackend)
          .catch(console.error)

        const sessions = [
          ...current.sessions,
          {
            id: uid("ses"),
            name: input.name.trim(),
            start: input.start,
            end: input.end,
            current: false,
          },
        ]
        return {
          next: withAudit(
            { ...current, sessions },
            actor,
            `Created session ${input.name.trim()}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const activateSession = useCallback(
    (id: string, actor: string) =>
      simple((current) => {
        const target = current.sessions.find((item) => item.id === id)
        if (!target) return { error: "Session not found." }

        const numId = Number(id.replace(/^ses-/, ""))
        if (Number.isFinite(numId)) {
          api
            .post(`/sessions/${numId}/activate`)
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              sessions: current.sessions.map((item) => ({
                ...item,
                current: item.id === id,
              })),
            },
            actor,
            `Activated academic session ${target.name}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const addClass = useCallback(
    (input: Omit<ClassSection, "id" | "label">, actor: string) =>
      simple((current) => {
        if (!input.grade.trim() || !input.section.trim())
          return { error: "Grade and section are required." }
        const session = current.sessions.find((item) => item.current)
        const fkSessionId = session ? Number(session.id) : NaN
        if (!Number.isFinite(fkSessionId)) {
          return { error: "Activate an academic session before adding classes." }
        }
        const grade = input.grade.trim()
        const section = input.section.trim()
        const label =
          section === "Main" || section === "General"
            ? grade
            : `${grade} · ${section}`
        if (
          current.classes.some(
            (item) => item.label.toLowerCase() === label.toLowerCase()
          )
        )
          return { error: "That class section already exists." }

        void api
          .post("/classes", {
            fkSessionId,
            grade,
            section,
            label,
            room: input.room.trim() || "Unassigned",
            periodCount: Math.max(1, Number(input.periodCount) || 8),
            monthlyFee: Math.max(0, Number(input.monthlyFee) || 8500),
          })
          .then(syncBackend)
          .catch(console.error)

        return {
          next: withAudit(
            current,
            actor,
            `Added class ${label}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const addSubject = useCallback(
    (input: Omit<Subject, "id">, actor: string) =>
      simple((current) => {
        if (!input.name.trim() || !input.code.trim())
          return { error: "Subject name and code are required." }
        if (
          current.subjects.some(
            (item) =>
              item.code.toLowerCase() === input.code.trim().toLowerCase()
          )
        )
          return { error: "Subject code must be unique." }

        api
          .post("/subjects", {
            name: input.name.trim(),
            code: input.code.trim().toUpperCase(),
          })
          .then(syncBackend)
          .catch(console.error)

        return {
          next: withAudit(
            {
              ...current,
              subjects: [
                ...current.subjects,
                {
                  id: uid("sub"),
                  name: input.name.trim(),
                  code: input.code.trim().toUpperCase(),
                },
              ],
            },
            actor,
            `Added subject ${input.name.trim()}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const addStaff = useCallback(
    (
      input: Pick<
        Staff,
        "name" | "role" | "email" | "phone" | "subject" | "classIds"
      >,
      actor: Actor
    ) =>
      simple((current) => {
        const isTeacher = input.role === "Teacher"
        const blocked = denied(
          actor,
          isTeacher ? "staff.create.teacher" : "staff.create.any"
        )
        if (blocked)
          return {
            error: isTeacher
              ? blocked
              : "Only the super admin can create office accounts.",
          }
        if (!input.name.trim() || !input.email.trim())
          return { error: "Name and email are required." }
        if (
          isTeacher &&
          !current.subjects.some((subject) => subject.name === input.subject)
        )
          return { error: "A teacher cannot be created without a subject." }
        if (
          current.staff.some(
            (person) =>
              person.email.toLowerCase() === input.email.trim().toLowerCase()
          )
        )
          return { error: "That email is already in use." }
        const person: Staff = {
          ...input,
          id: uid("st"),
          name: input.name.trim(),
          email: input.email.trim(),
          subject: isTeacher ? input.subject : "",
          subjectHistory: isTeacher
            ? [
                {
                  subject: input.subject,
                  from: getToday(),
                  by: actor.name,
                  reason: "Initial allocation",
                },
              ]
            : [],
        }

        const sub = current.subjects.find((s) => s.name === input.subject)
        const nameParts = input.name.trim().split(" ")
        api
          .post("/users", {
            firstName: nameParts[0] || input.name.trim(),
            lastName: nameParts.slice(1).join(" ") || "Staff",
            email: input.email.trim(),
            phone: input.phone || null,
            role: isTeacher
              ? "teacher"
              : input.role === "Accountant"
                ? "accountant"
                : input.role === "Operations Manager"
                  ? "operations_manager"
                  : "super_admin",
            subjectId: isTeacher && sub ? Number(sub.id) : undefined,
            password: "password",
          })
          .then(syncBackend)
          .catch(console.error)

        return {
          next: withAudit(
            { ...current, staff: [...current.staff, person] },
            actor.name,
            `Added ${input.role.toLowerCase()} ${person.name}${isTeacher ? ` (${input.subject})` : ""}`,
            isTeacher ? "teacher_subject" : undefined
          ),
        }
      }),
    [simple, syncBackend]
  )

  const setClassPeriodCount = useCallback(
    (classId: string, periodCount: number, actor: string) =>
      simple((current) => {
        if (
          !Number.isFinite(periodCount) ||
          periodCount < 1 ||
          periodCount > 16
        )
          return { error: "Period count must be between 1 and 16." }
        if (
          current.slots.some(
            (slot) => slot.classId === classId && slot.periodIndex > periodCount
          )
        )
          return {
            error: "Remove timetable periods beyond the new count first.",
          }
        const numId = Number(classId)
        if (Number.isFinite(numId)) {
          api
            .put(`/classes/${numId}`, { periodCount })
            .then(syncBackend)
            .catch(console.error)
        }
        return {
          next: withAudit(
            {
              ...current,
              classes: current.classes.map((klass) =>
                klass.id === classId ? { ...klass, periodCount } : klass
              ),
            },
            actor,
            `Set period count for ${classId} to ${periodCount}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  // ---- teachers & substitutes --------------------------------------------------

  const changeTeacherSubject = useCallback(
    (staffId: string, subject: string, reason: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "teachers.subject.change")
        if (blocked) return { error: blocked }
        const teacher = current.staff.find(
          (person) => person.id === staffId && person.role === "Teacher"
        )
        if (!teacher) return { error: "Teacher not found." }
        const targetSub = current.subjects.find((item) => item.name === subject)
        if (!targetSub) return { error: "Choose a subject." }
        if (teacher.subject === subject)
          return { error: `${teacher.name} already teaches ${subject}.` }
        const history = [
          ...teacher.subjectHistory.map((row) =>
            row.to ? row : { ...row, to: getToday() }
          ),
          {
            subject,
            from: getToday(),
            by: actor.name,
            reason: reason.trim() || undefined,
          },
        ]
        const staff = current.staff.map((person) =>
          person.id === staffId
            ? { ...person, subject, subjectHistory: history }
            : person
        )

        const teacherNumId = Number(teacher.id)
        if (Number.isFinite(teacherNumId)) {
          api
            .put(`/teachers/${teacherNumId}/subject`, {
              subjectId: Number(targetSub.id),
              reason: reason.trim() || "Subject re-assignment",
            })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            { ...current, staff },
            actor.name,
            `Changed ${teacher.name}'s subject from ${teacher.subject} to ${subject}${reason.trim() ? `: ${reason.trim()}` : ""}`,
            "teacher_subject"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const markTeacherAbsent = useCallback(
    (
      input: {
        teacherId: string
        date: string
        periods: number[]
        notes: string
      },
      actor: Actor
    ) =>
      simple((current) => {
        const blocked = denied(actor, "absences.manage")
        if (blocked) return { error: blocked }
        const teacher = current.staff.find(
          (person) => person.id === input.teacherId && person.role === "Teacher"
        )
        if (!teacher) return { error: "Choose a teacher." }
        if (!input.date) return { error: "Choose a date." }
        if (!input.periods.length)
          return { error: "Choose at least one period." }
        const weekday = weekdayOf(input.date)
        const open = (period: number) =>
          current.teacherAbsences.some(
            (row) =>
              row.teacherId === teacher.id &&
              row.date === input.date &&
              row.periodIndex === period &&
              row.status !== "Cancelled"
          )
        const fresh = input.periods.filter((period) => !open(period))
        if (!fresh.length)
          return {
            error: `${teacher.name} is already marked absent for those periods.`,
          }
        const rows: TeacherAbsence[] = fresh.map((periodIndex) => {
          const slot = current.slots.find(
            (item) =>
              item.teacherId === teacher.id &&
              item.day === weekday &&
              item.periodIndex === periodIndex
          )
          return {
            id: uid("abs"),
            teacherId: teacher.id,
            date: input.date,
            periodIndex,
            classId: slot?.classId,
            subject: slot?.subject,
            status: slot ? "Pending" : "NoClass",
            markedBy: actor.name,
            notes: input.notes.trim(),
          }
        })

        const teacherNumId = Number(teacher.id)
        if (Number.isFinite(teacherNumId)) {
          api
            .post("/teacher-absences", {
              teacherId: teacherNumId,
              date: input.date,
              periods: fresh,
              notes: input.notes.trim() || undefined,
            })
            .then(() => syncPortalForRoute(actor.role, "substitutes"))
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              teacherAbsences: [...rows, ...current.teacherAbsences],
            },
            actor.name,
            `Marked ${teacher.name} absent on ${input.date} (periods ${fresh.join(", ")})`,
            "teacher_absence"
          ),
        }
      }),
    [simple, syncPortalForRoute]
  )

  const assignSubstitute = useCallback(
    (absenceId: string, substituteId: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "absences.manage")
        if (blocked) return { error: blocked }
        const absence = current.teacherAbsences.find(
          (row) => row.id === absenceId
        )
        if (!absence) return { error: "Absence not found." }
        if (
          absence.status === "Cancelled" ||
          absence.status === "NoClass" ||
          !absence.classId
        )
          return { error: "This period has no class to cover." }
        const substitute = current.staff.find(
          (person) => person.id === substituteId && person.role === "Teacher"
        )
        if (!substitute || substitute.id === absence.teacherId)
          return { error: "Choose another teacher." }
        const others = current.substitutions.filter(
          (row) => row.absenceId !== absence.id
        )
        const busy = busyReason(
          substitute.id,
          absence.date,
          absence.periodIndex,
          current.slots,
          others,
          current.teacherAbsences
        )
        if (busy)
          return {
            error: `${substitute.name} ${busy} — choose a free teacher.`,
          }
        const substitution = {
          id: uid("sub"),
          absenceId: absence.id,
          date: absence.date,
          periodIndex: absence.periodIndex,
          classId: absence.classId,
          subject: absence.subject ?? "",
          originalTeacherId: absence.teacherId,
          substituteTeacherId: substitute.id,
          authorizedBy: actor.name,
          at: new Date().toISOString(),
        }
        const next: SchoolState = {
          ...current,
          substitutions: [substitution, ...others],
          teacherAbsences: current.teacherAbsences.map((row) =>
            row.id === absence.id ? { ...row, status: "Covered" } : row
          ),
        }
        const klass =
          current.classes.find((item) => item.id === absence.classId)?.label ??
          absence.classId

        const absenceNumId = Number(absence.id)
        const subNumId = Number(substitute.id)
        if (Number.isFinite(absenceNumId) && Number.isFinite(subNumId)) {
          api
            .put(`/teacher-absences/${absenceNumId}/substitute`, {
              substituteTeacherId: subNumId,
            })
            .then(() => syncPortalForRoute(actor.role, "substitutes"))
            .catch(console.error)
        }

        return {
          next: withAudit(
            next,
            actor.name,
            `Assigned ${substitute.name} to cover ${klass} ${absence.subject} (period ${absence.periodIndex}, ${absence.date}) for ${staffName(current, absence.teacherId)}`,
            "substitute_assignment"
          ),
        }
      }),
    [simple, syncPortalForRoute]
  )

  const removeSubstitute = useCallback(
    (absenceId: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "absences.manage")
        if (blocked) return { error: blocked }
        const substitution = current.substitutions.find(
          (row) => row.absenceId === absenceId
        )
        if (!substitution) return { error: "No substitute is assigned." }
        const next: SchoolState = {
          ...current,
          substitutions: current.substitutions.filter(
            (row) => row.absenceId !== absenceId
          ),
          teacherAbsences: current.teacherAbsences.map((row) =>
            row.id === absenceId ? { ...row, status: "Pending" } : row
          ),
        }
        const absenceNumId = Number(absenceId)
        if (Number.isFinite(absenceNumId)) {
          api
            .delete(`/teacher-absences/${absenceNumId}/substitute`)
            .then(() => syncPortalForRoute(actor.role, "substitutes"))
            .catch(console.error)
        }
        return {
          next: withAudit(
            next,
            actor.name,
            `Removed ${staffName(current, substitution.substituteTeacherId)} as substitute (period ${substitution.periodIndex}, ${substitution.date})`,
            "substitute_assignment"
          ),
        }
      }),
    [simple, syncPortalForRoute]
  )

  const cancelAbsence = useCallback(
    (absenceId: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "absences.manage")
        if (blocked) return { error: blocked }
        const absence = current.teacherAbsences.find(
          (row) => row.id === absenceId
        )
        if (!absence) return { error: "Absence not found." }
        const next: SchoolState = {
          ...current,
          substitutions: current.substitutions.filter(
            (row) => row.absenceId !== absenceId
          ),
          teacherAbsences: current.teacherAbsences.map((row) =>
            row.id === absenceId ? { ...row, status: "Cancelled" } : row
          ),
        }
        const absenceNumId = Number(absenceId)
        if (Number.isFinite(absenceNumId)) {
          api
            .post(`/teacher-absences/${absenceNumId}/cancel`)
            .then(() => syncPortalForRoute(actor.role, "substitutes"))
            .catch(console.error)
        }
        return {
          next: withAudit(
            next,
            actor.name,
            `Cancelled ${staffName(current, absence.teacherId)}'s absence (period ${absence.periodIndex}, ${absence.date})`,
            "teacher_absence"
          ),
        }
      }),
    [simple, syncPortalForRoute]
  )

  // ---- planned chapters & daily updates ----------------------------------------

  const addPlannedChapter = useCallback(
    (
      input: Pick<
        PlannedChapter,
        "classId" | "subject" | "title" | "description" | "targetDate"
      >,
      actor: Actor
    ) =>
      simple((current) => {
        const blocked = denied(actor, "chapters.manage")
        if (blocked) return { error: blocked }
        if (!input.classId || !input.subject || !input.title.trim())
          return { error: "Class, subject and chapter title are required." }
        const siblings = current.plannedChapters.filter(
          (row) =>
            row.classId === input.classId && row.subject === input.subject
        )
        const chapter: PlannedChapter = {
          ...input,
          id: uid("ch"),
          title: input.title.trim(),
          sequence: siblings.length + 1,
          createdBy: actor.name,
        }

        const classNumId = Number(input.classId)
        const sub = current.subjects.find((s) => s.name === input.subject)
        const subNumId = Number(sub?.id ?? 1)
        if (Number.isFinite(classNumId) && Number.isFinite(subNumId)) {
          api
            .post("/planned-chapters", {
              fkClassId: classNumId,
              fkSubjectId: subNumId,
              title: input.title.trim(),
              description: input.description?.trim() || null,
              targetDate: input.targetDate || null,
            })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              plannedChapters: [...current.plannedChapters, chapter],
            },
            actor.name,
            `Planned ${chapter.title} for ${input.subject}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const removePlannedChapter = useCallback(
    (id: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "chapters.manage")
        if (blocked) return { error: blocked }
        if (current.dailyLessons.some((lesson) => lesson.chapterId === id))
          return {
            error:
              "This chapter already has daily updates and cannot be removed.",
          }
        const chapNumId = Number(id.replace(/^ch-/, ""))
        if (Number.isFinite(chapNumId)) {
          api
            .delete(`/planned-chapters/${chapNumId}`)
            .then(syncBackend)
            .catch(console.error)
        }
        return {
          next: withAudit(
            {
              ...current,
              plannedChapters: current.plannedChapters.filter(
                (row) => row.id !== id
              ),
            },
            actor.name,
            "Removed a planned chapter"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const submitDailyLesson = useCallback(
    (
      input: {
        classId: string
        date: string
        chapterId: string
        classwork: string
        homework: string
        remarks: string
      },
      actor: Actor
    ) =>
      simple((current) => {
        const blocked = denied(actor, "lessons.submit")
        if (blocked) return { error: blocked }
        const teacher = signedInTeacher(current) as Staff
        if (!teacher.classIds.includes(input.classId))
          return { error: "You can only post updates for your own classes." }
        const chapter = current.plannedChapters.find(
          (row) => row.id === input.chapterId
        )
        if (
          !chapter ||
          chapter.classId !== input.classId ||
          chapter.subject !== teacher.subject
        )
          return {
            error:
              "Choose one of the planned chapters for this class and your subject.",
          }
        const existing = current.dailyLessons.find(
          (row) =>
            row.teacherId === teacher.id &&
            row.classId === input.classId &&
            row.date === input.date
        )
        if (existing?.reviewStatus === "Approved")
          return { error: "Today's update is already approved." }
        const lesson = {
          id: existing?.id ?? uid("dl"),
          classId: input.classId,
          subject: teacher.subject,
          teacherId: teacher.id,
          teacherName: teacher.name,
          date: input.date,
          chapterId: chapter.id,
          classwork: input.classwork.trim(),
          homework: input.homework.trim(),
          remarks: input.remarks.trim(),
          reviewStatus: "Submitted" as const,
        }

        const classNumId = Number(input.classId)
        const chapNumId = Number(chapter.id.replace(/^ch-/, ""))
        if (Number.isFinite(classNumId) && Number.isFinite(chapNumId)) {
          api
            .post("/daily-lessons", {
              classId: classNumId,
              plannedChapterId: chapNumId,
              date: input.date,
              classwork: input.classwork.trim(),
              homework: input.homework.trim(),
              remarks: input.remarks.trim(),
            })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              dailyLessons: [
                lesson,
                ...current.dailyLessons.filter((row) => row.id !== lesson.id),
              ],
            },
            actor.name,
            `Submitted daily update: ${chapter.title}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const reviewDailyLesson = useCallback(
    (
      id: string,
      decision: Exclude<ReviewStatus, "Submitted">,
      note: string,
      actor: Actor
    ) =>
      simple((current) => {
        const blocked = denied(actor, "lessons.review")
        if (blocked) return { error: blocked }
        const lesson = current.dailyLessons.find((row) => row.id === id)
        if (!lesson) return { error: "Update not found." }
        if (decision === "Rejected" && !note.trim())
          return { error: "Tell the teacher why the update is rejected." }
        const next = {
          ...current,
          dailyLessons: current.dailyLessons.map((row) =>
            row.id === id
              ? {
                  ...row,
                  reviewStatus: decision,
                  reviewedBy: actor.name,
                  reviewNote: note.trim() || undefined,
                }
              : row
          ),
        }

        const lessonNumId = Number(id.replace(/^dl-/, ""))
        if (Number.isFinite(lessonNumId)) {
          api
            .post(`/daily-lessons/${lessonNumId}/review`, {
              decision,
              note: note.trim() || null,
            })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            next,
            actor.name,
            `${decision} ${lesson.teacherName}'s daily update for ${lesson.date}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  // ---- weekly tests --------------------------------------------------------------

  const saveTestSchedule = useCallback(
    async (
      input: Omit<TestSchedule, "id" | "active">,
      actor: Actor
    ): Promise<Result> => {
      const blocked = denied(actor, "tests.schedule")
      if (blocked) return blocked
      if (!input.classId || !input.subject || !input.weekday)
        return "Class, subject and test day are required."
      if (input.max <= 0) return "Maximum marks must be positive."
      const current = stateRef.current
      const classNumId = Number(input.classId)
      const sub = current.subjects.find(
        (row) => row.name.toLowerCase() === input.subject.toLowerCase()
      )
      const subNumId = Number(sub?.id)
      if (!Number.isFinite(classNumId) || !Number.isFinite(subNumId)) {
        return "Could not match this class and subject on the server."
      }
      try {
        const { default: examsService } = await import(
          "@/api/exams/exams.service"
        )
        await examsService.saveSchedule({
          classId: classNumId,
          subjectId: subNumId,
          weekday: input.weekday,
          maxScore: input.max,
        })
        const partial = await fetchSchoolDataSlices(["testSchedules"])
        commit((current) => ({ next: { ...current, ...partial } }))
        return null
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Could not save the test day."
      }
    },
    [commit]
  )

  const removeTestSchedule = useCallback(
    async (id: string, actor: Actor): Promise<Result> => {
      const blocked = denied(actor, "tests.schedule")
      if (blocked) return blocked
      const row = stateRef.current.testSchedules.find((item) => item.id === id)
      if (!row) return "That test day is already gone."
      const numericId = Number(id)
      if (!Number.isFinite(numericId)) {
        return "This schedule is not saved on the server."
      }
      try {
        const { default: examsService } = await import(
          "@/api/exams/exams.service"
        )
        await examsService.deactivateSchedule(numericId)
        const partial = await fetchSchoolDataSlices(["testSchedules"])
        commit((current) => ({ next: { ...current, ...partial } }))
        return null
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Could not remove the test day."
      }
    },
    [commit]
  )

  const generateMonthTests = useCallback(
    (month: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "tests.schedule")
        if (blocked) return { error: blocked }
        const created = current.testSchedules
          .filter((schedule) => schedule.active)
          .flatMap((schedule) => {
            const roster = current.students.filter(
              (student) =>
                student.classId === schedule.classId &&
                student.status === "Active"
            )
            return datesOnWeekday(month, schedule.weekday)
              .filter(
                (date) =>
                  !current.weeklyTests.some(
                    (test) =>
                      test.scheduleId === schedule.id && test.date === date
                  )
              )
              .map((date) => ({
                id: uid("wt"),
                scheduleId: schedule.id,
                classId: schedule.classId,
                subject: schedule.subject,
                date,
                month,
                week: weekOfMonth(date),
                max: schedule.max,
                status: "Scheduled" as const,
                results: roster.map((student) => ({
                  studentId: student.id,
                  score: null,
                })),
              }))
          })
        if (!created.length)
          return {
            error: `Every scheduled test for ${monthLabel(month)} already exists.`,
          }

        api
          .post("/daily-tests/generate", { month })
          .then(syncBackend)
          .catch(console.error)

        return {
          next: withAudit(
            { ...current, weeklyTests: [...current.weeklyTests, ...created] },
            actor.name,
            `Generated ${created.length} weekly tests for ${monthLabel(month)}`,
            "daily_test"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const saveWeeklyMarks = useCallback(
    (
      testId: string,
      results: { studentId: string; score: number | null }[],
      actor: Actor
    ) =>
      simple((current) => {
        const blocked = denied(actor, "tests.marks")
        if (blocked) return { error: blocked }
        const test = current.weeklyTests.find((row) => row.id === testId)
        if (!test) return { error: "Test not found." }
        if (actor.role === "teacher") {
          const teacher = signedInTeacher(current) as Staff
          if (
            teacher.subject !== test.subject ||
            !teacher.classIds.includes(test.classId)
          )
            return {
              error:
                "You can only enter marks for your own subject and classes.",
            }
        }
        if (test.status === "Published")
          return { error: "Published marks are locked." }
        if (test.date > getToday())
          return { error: "Marks can be entered on or after the test date." }
        if (
          results.some(
            (row) =>
              row.score !== null && (row.score < 0 || row.score > test.max)
          )
        )
          return { error: `Scores must be between 0 and ${test.max}.` }
        const next = {
          ...current,
          weeklyTests: current.weeklyTests.map((row) =>
            row.id === testId
              ? {
                  ...row,
                  results,
                  status: "MarksEntered" as const,
                  enteredBy: actor.name,
                }
              : row
          ),
        }

        const testNumId = Number(testId.replace(/^wt-/, ""))
        if (Number.isFinite(testNumId)) {
          const marks = results.map((r) => {
            const student = current.students.find(
              (s) => s.id === r.studentId || s.admissionNo === r.studentId
            )
            return {
              studentId: Number(student?.id ?? r.studentId),
              score: r.score,
            }
          })
          api
            .put(`/daily-tests/${testNumId}/marks`, { marks })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            next,
            actor.name,
            `Entered ${test.subject} weekly test marks for ${test.date}`,
            "daily_test"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const publishWeeklyTest = useCallback(
    (testId: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "tests.publish")
        if (blocked) return { error: blocked }
        const test = current.weeklyTests.find((row) => row.id === testId)
        if (!test) return { error: "Test not found." }
        if (test.status !== "MarksEntered")
          return { error: "Only tests with entered marks can be published." }
        const published = withAudit(
          {
            ...current,
            weeklyTests: current.weeklyTests.map((row) =>
              row.id === testId
                ? {
                    ...row,
                    status: "Published" as const,
                    publishedBy: actor.name,
                  }
                : row
            ),
          },
          actor.name,
          `Published ${test.subject} weekly test (${test.date})`,
          "daily_test"
        )

        const testNumId = Number(testId.replace(/^wt-/, ""))
        if (Number.isFinite(testNumId)) {
          api
            .post(`/daily-tests/${testNumId}/publish`)
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: auditOutcomes(
            published,
            test.classId,
            test.subject,
            test.month
          ),
        }
      }),
    [simple, syncBackend]
  )

  // ---- marks sheets ----------------------------------------------------------------

  const saveScores = useCallback(
    (sheetId: string, rows: MarkRow[], actor: string) =>
      simple((current) => {
        const target = current.sheets.find((sheet) => sheet.id === sheetId)
        if (!target) return { error: "Mark sheet was not found." }
        if (target.status !== "Draft")
          return { error: "This sheet is locked. Ask management to reopen it." }
        if (
          rows.some(
            (row) =>
              row.score !== null && (row.score < 0 || row.score > target.max)
          )
        )
          return { error: `Scores must be between 0 and ${target.max}.` }

        const sheetNumId = Number(sheetId.replace(/^sh-/, ""))
        if (Number.isFinite(sheetNumId)) {
          const apiRows = rows.map((r) => {
            const student = current.students.find(
              (s) => s.id === r.studentId || s.admissionNo === r.studentId
            )
            return {
              fkStudentId: Number(student?.id ?? r.studentId),
              score: r.score,
            }
          })
          api
            .put(`/exams/sheets/${sheetNumId}/rows`, { rows: apiRows })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              sheets: current.sheets.map((sheet) =>
                sheet.id === sheetId ? { ...sheet, rows } : sheet
              ),
            },
            actor,
            "Saved draft marks"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const setSheetStatus = useCallback(
    (sheetId: string, status: SheetStatus, actor: string) =>
      simple((current) => {
        const target = current.sheets.find((sheet) => sheet.id === sheetId)
        if (!target) return { error: "Mark sheet was not found." }
        if (status !== "Draft" && target.rows.some((row) => row.score === null))
          return {
            error: "Enter every score before moving this sheet forward.",
          }
        const allowed: Record<SheetStatus, SheetStatus[]> = {
          Draft: ["Submitted"],
          Submitted: ["Verified", "Draft"],
          Verified: ["Published", "Draft"],
          Published: ["Draft"],
        }
        if (
          !allowed[target.status].includes(status) &&
          status !== target.status
        )
          return {
            error: `Cannot move a ${target.status.toLowerCase()} sheet to ${status.toLowerCase()}.`,
          }

        const sheetNumId = Number(sheetId.replace(/^sh-/, ""))
        if (Number.isFinite(sheetNumId)) {
          const actionEndpoint =
            status === "Submitted"
              ? "submit"
              : status === "Verified"
                ? "verify"
                : status === "Published"
                  ? "publish"
                  : "reopen"
          api
            .post(`/exams/sheets/${sheetNumId}/${actionEndpoint}`)
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              sheets: current.sheets.map((sheet) =>
                sheet.id === sheetId ? { ...sheet, status } : sheet
              ),
            },
            actor,
            `Moved ${target.subject} (${target.examName}) to ${status}`
          ),
        }
      }),
    [simple, syncBackend]
  )

  // ---- results & settings -----------------------------------------------------------

  const grantResultOverride = useCallback(
    (examId: string, studentId: string, reason: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "results.override")
        if (blocked) return { error: blocked }
        // D9: a reason is always required, whatever the legacy setting says.
        if (reason.trim().length < 3)
          return { error: "Give a reason of at least 3 characters." }
        if (
          !current.sheets.some(
            (sheet) =>
              sheet.examId === examId &&
              sheet.rows.some((row) => row.studentId === studentId)
          )
        )
          return { error: "This student has no result in that exam." }
        if (
          current.resultOverrides.some(
            (row) =>
              row.examId === examId &&
              row.studentId === studentId &&
              !row.revokedAt
          )
        )
          return { error: "An override is already active." }
        const override = {
          id: uid("ov"),
          examId,
          studentId,
          reason: reason.trim(),
          grantedBy: actor.name,
          grantedAt: new Date().toISOString(),
        }
        const exam =
          current.sheets.find((sheet) => sheet.examId === examId)?.examName ??
          examId

        const examNumId = Number(examId.replace(/^ex-/, ""))
        const student = current.students.find(
          (s) => s.id === studentId || s.admissionNo === studentId
        )
        const studentNumId = Number(student?.id ?? studentId)
        if (Number.isFinite(examNumId) && Number.isFinite(studentNumId)) {
          api
            .post(`/exams/${examNumId}/overrides`, {
              studentId: studentNumId,
              reason: reason.trim(),
            })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            {
              ...current,
              resultOverrides: [override, ...current.resultOverrides],
            },
            actor.name,
            `Released ${exam} for ${studentLabel(current, studentId)} (fee override): ${reason.trim()}`,
            "result_override"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const revokeResultOverride = useCallback(
    (overrideId: string, actor: Actor) =>
      simple((current) => {
        const blocked = denied(actor, "results.override")
        if (blocked) return { error: blocked }
        const override = current.resultOverrides.find(
          (row) => row.id === overrideId && !row.revokedAt
        )
        if (!override) return { error: "Override not found." }
        const next = {
          ...current,
          resultOverrides: current.resultOverrides.map((row) =>
            row.id === overrideId
              ? {
                  ...row,
                  revokedAt: new Date().toISOString(),
                  revokedBy: actor.name,
                }
              : row
          ),
        }

        const ovNumId = Number(overrideId.replace(/^ov-/, ""))
        if (Number.isFinite(ovNumId)) {
          api
            .delete(`/exams/overrides/${ovNumId}`)
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            next,
            actor.name,
            `Revoked result override for ${studentLabel(current, override.studentId)}`,
            "result_override"
          ),
        }
      }),
    [simple, syncBackend]
  )

  const updateSettings = useCallback(
    async (
      patch: Partial<SchoolSettings>,
      actor: Actor
    ): Promise<Result> => {
      if (patch.resultVisibility && !can(actor.role, "settings.results")) {
        return "Only the super admin can change the result fee rule."
      }
      if (patch.fees && !can(actor.role, "settings.fees")) {
        return "Only the super admin can change fee settings."
      }
      if (patch.fees) {
        if (patch.fees.defaultMonthlyFee < 0)
          return "Default monthly fee cannot be negative."
        if (patch.fees.dueDay < 1 || patch.fees.dueDay > 28)
          return "Due day must be between 1 and 28."
        if (patch.fees.maxAdvanceMonths < 0 || patch.fees.maxAdvanceMonths > 24)
          return "Advance months must be between 0 and 24."
      }
      if (patch.dailyTestRules) {
        const blocked = denied(actor, "settings.academic")
        if (blocked) return blocked
        const rules = patch.dailyTestRules
        if (
          rules.passPercent <= 0 ||
          rules.passPercent > 100 ||
          rules.lowMarksBelowPercent <= 0 ||
          rules.lowMarksBelowPercent > 100
        )
          return "Percentages must be between 1 and 100."
        if (rules.maxFailsPerMonth < 0 || rules.lowMarksMinPassed < 0)
          return "Counts cannot be negative."
      }
      if (patch.attendance) {
        const blocked = denied(actor, "settings.academic")
        if (blocked) return blocked
        if (patch.attendance.editWindowDays < 0 || patch.attendance.editWindowDays > 31)
          return "Edit window must be between 0 and 31 days."
        if (patch.attendance.lowThreshold < 1 || patch.attendance.lowThreshold > 100)
          return "Low attendance threshold must be between 1% and 100%."
      }
      if (patch.admission) {
        const blocked = denied(actor, "settings.academic")
        if (blocked) return blocked
        if (patch.admission.digits < 1 || patch.admission.digits > 8)
          return "Digits must be between 1 and 8."
      }

      try {
        if (patch.dailyTestRules) {
          await api.put("/settings/dailyTestRules", patch.dailyTestRules)
        }
        if (patch.resultVisibility) {
          await api.put("/settings/resultVisibility", patch.resultVisibility)
        }
        if (patch.fees) {
          await api.put("/settings/fees", patch.fees)
        }
        if (patch.attendance) {
          await api.put("/settings/attendance", patch.attendance)
        }
        if (patch.admission) {
          await api.put("/settings/admission", patch.admission)
        }
      } catch (err) {
        if (err instanceof ApiHttpError) return err.message
        if (err instanceof Error && err.message) return err.message
        return "Could not save settings. Check your connection and try again."
      }

      simple((current) => {
        const settings = { ...current.settings, ...patch }
        return {
          next: withAudit(
            { ...current, settings },
            actor.name,
            `Updated ${Object.keys(patch).join(", ")} settings`,
            "school_setting"
          ),
        }
      })
      void Promise.resolve(syncBackend()).catch(console.error)
      return null
    },
    [simple, syncBackend]
  )

  // ---- attendance & communication ----------------------------------------------------

  /** Saves on the server first; the local register only changes once the API accepts it (e.g. not a 403). */
  const saveAttendance = useCallback(
    async (
      classId: string,
      date: string,
      rows: { studentId: string; status: AttendanceStatus }[],
      actor: string
    ) => {
      const classNumId = Number(classId)
      if (Number.isFinite(classNumId)) {
        const marks = rows.map((r) => ({ studentId: Number(r.studentId), status: r.status }))
        await api.post("/attendances/mark", { classId: classNumId, date, marks })
      }
      simple((current) => {
        const rest = current.attendance.filter(
          (mark) =>
            !(
              mark.classId === classId &&
              mark.date === date &&
              rows.some((row) => row.studentId === mark.studentId)
            )
        )
        return {
          next: withAudit(
            {
              ...current,
              attendance: [
                ...rows.map((row) => ({ ...row, classId, date })),
                ...rest,
              ],
            },
            actor,
            `Saved attendance for ${date}`
          ),
        }
      })
      void Promise.resolve(syncBackend()).catch(console.error)
    },
    [simple, syncBackend]
  )

  const addUpdate = useCallback(
    (
      input: Omit<SchoolUpdate, "id" | "status" | "author"> & { author: string }
    ) =>
      simple((current) => {
        if (!input.text.trim())
          return { error: "Write the update before submitting." }
        const item: SchoolUpdate = {
          ...input,
          text: input.text.trim(),
          id: uid("up"),
          status: "Draft",
        }

        const classNumId = Number(input.classId)
        if (Number.isFinite(classNumId)) {
          api
            .post("/updates", {
              classId: classNumId,
              kind: input.kind,
              subject: input.subject || "General",
              text: input.text.trim(),
              due: input.due || null,
              author: input.author || null,
            })
            .then(syncBackend)
            .catch(console.error)
        }

        return {
          next: withAudit(
            { ...current, updates: [item, ...current.updates] },
            input.author,
            `Drafted a ${input.kind.toLowerCase()} update`
          ),
        }
      }),
    [simple, syncBackend]
  )

  const setUpdateStatus = useCallback(
    (id: string, status: UpdateStatus, actor: string) => {
      simple((current) => {
        const updateNumId = Number(id.replace(/^up-/, ""))
        if (Number.isFinite(updateNumId)) {
          api
            .patch(`/updates/${updateNumId}/status`, { status })
            .then(syncBackend)
            .catch(console.error)
        }
        return {
          next: withAudit(
            {
              ...current,
              updates: current.updates.map((item) =>
                item.id === id ? { ...item, status } : item
              ),
            },
            actor,
            `Marked an update as ${status}`
          ),
        }
      })
    },
    [simple, syncBackend]
  )

  const value = useMemo<SchoolContextValue>(
    () => ({
      state,
      syncPortalForRoute,
      ensureAdmissionWizardData,
      addApplication,
      persistApplicationDraft,
      patchApplicationRecord,
      finalizeApplication,
      setApplicationStatus,
      updateStudent,
      addSession,
      activateSession,
      addClass,
      addSubject,
      addStaff,
      saveAttendance,
      addUpdate,
      setUpdateStatus,
      saveScores,
      setSheetStatus,
      setClassPeriodCount,
      recordPayment,
      confirmPayment,
      changeTeacherSubject,
      markTeacherAbsent,
      assignSubstitute,
      removeSubstitute,
      cancelAbsence,
      addPlannedChapter,
      removePlannedChapter,
      submitDailyLesson,
      reviewDailyLesson,
      saveTestSchedule,
      removeTestSchedule,
      generateMonthTests,
      saveWeeklyMarks,
      publishWeeklyTest,
      grantResultOverride,
      revokeResultOverride,
      updateSettings,
    }),
    [
      state,
      syncPortalForRoute,
      ensureAdmissionWizardData,
      addApplication,
      persistApplicationDraft,
      patchApplicationRecord,
      finalizeApplication,
      setApplicationStatus,
      updateStudent,
      addSession,
      activateSession,
      addClass,
      addSubject,
      addStaff,
      saveAttendance,
      addUpdate,
      setUpdateStatus,
      saveScores,
      setSheetStatus,
      setClassPeriodCount,
      recordPayment,
      confirmPayment,
      changeTeacherSubject,
      markTeacherAbsent,
      assignSubstitute,
      removeSubstitute,
      cancelAbsence,
      addPlannedChapter,
      removePlannedChapter,
      submitDailyLesson,
      reviewDailyLesson,
      saveTestSchedule,
      removeTestSchedule,
      generateMonthTests,
      saveWeeklyMarks,
      publishWeeklyTest,
      grantResultOverride,
      revokeResultOverride,
      updateSettings,
    ]
  )

  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  )
}

export function useSchool() {
  const context = useContext(SchoolContext)
  if (!context) throw new Error("useSchool must be used within SchoolProvider")
  return context
}

export function studentName(students: Student[], id: string) {
  return students.find((student) => student.id === id)?.name ?? id
}
