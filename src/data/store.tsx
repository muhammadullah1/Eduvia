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
  type SchoolDataSlice,
  sessionPermissions,
} from "@/data/portal-sync"
import { portalSyncKey, runPortalSyncOnce } from "@/data/portal-sync-flight"
import {
  type Application,
  type AttendanceStatus,
  DEFAULT_SETTINGS,
  type SchoolSettings,
  type SchoolState,
  type Student,
  type TestSchedule,
} from "@/data/types"
import { canNow, type PermissionKey } from "@/lib/access"
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
import { loadAuth, type Role,ROLE_LABELS } from "@/lib/auth"
import { gradingError, RECEIPT_FOOTER_MAX, sortedBands } from "@/lib/grading"
import {
  invalidateAdmissionDetail,
  invalidateAdmissionsLists,
} from "@/lib/invalidate-admissions"

const LEGACY_KEYS = ["eduvia-demo-v4", "eduvia-demo-v5"]

type ApplicationInput = Omit<Application, "id" | "status" | "submittedOn">
type Result = string | null

type SchoolContextValue = {
  state: SchoolState
  syncPortalForRoute: (role: Role, section: string) => Promise<void>
  ensureAdmissionWizardData: () => Promise<void>
  /** Re-fetch only these slices from the API (after a server-side write). */
  reloadSlices: (slices: SchoolDataSlice[]) => Promise<void>
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
  saveAttendance: (
    classId: string,
    date: string,
    rows: { studentId: string; status: AttendanceStatus }[],
    actor: string
  ) => Promise<void>
  // weekly tests (UR-05 / UR-06)
  saveTestSchedule: (
    input: Omit<TestSchedule, "id" | "active">,
    actor: Actor
  ) => Promise<Result>
  removeTestSchedule: (id: string, actor: Actor) => Promise<Result>
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
function denied(actor: Actor, permission: PermissionKey) {
  if (canNow(permission)) return null
  return `${ROLE_LABELS[actor.role]} is not allowed to do this.`
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
      const plan = resolvePortalSyncPlan(role, sessionPermissions(), section)
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

  const reloadSlices = useCallback(
    async (slices: SchoolDataSlice[]) => {
      if (!loadAuth()?.token) return
      const partial = await fetchSchoolDataSlices(slices)
      commit((current) => ({ next: { ...current, ...partial } }))
    },
    [commit]
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

  const updateSettings = useCallback(
    async (
      patch: Partial<SchoolSettings>,
      actor: Actor
    ): Promise<Result> => {
      if (patch.resultVisibility || patch.fees) {
        const blocked = denied(actor, "settings.fees.update")
        if (blocked) return blocked
      }
      if (patch.fees) {
        if (patch.fees.dueDay < 1 || patch.fees.dueDay > 28)
          return "Due day must be between 1 and 28."
        if (patch.fees.maxAdvanceMonths < 0 || patch.fees.maxAdvanceMonths > 24)
          return "Advance months must be between 0 and 24."
      }
      if (patch.dailyTestRules) {
        const blocked = denied(actor, "settings.academic.update")
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
        const blocked = denied(actor, "settings.academic.update")
        if (blocked) return blocked
        if (patch.attendance.editWindowDays < 0 || patch.attendance.editWindowDays > 31)
          return "Edit window must be between 0 and 31 days."
        if (patch.attendance.lowThreshold < 1 || patch.attendance.lowThreshold > 100)
          return "Low attendance threshold must be between 1% and 100%."
      }
      if (patch.admission) {
        const blocked = denied(actor, "settings.academic.update")
        if (blocked) return blocked
        if (patch.admission.digits < 1 || patch.admission.digits > 8)
          return "Digits must be between 1 and 8."
      }
      if (patch.grading) {
        const blocked = denied(actor, "settings.academic.update")
        if (blocked) return blocked
        const invalid = gradingError(patch.grading.bands)
        if (invalid) return invalid
      }
      if (patch.receipt) {
        const blocked = denied(actor, "settings.fees.update")
        if (blocked) return blocked
        if (patch.receipt.footerNote.length > RECEIPT_FOOTER_MAX)
          return `Receipt footer must be ${RECEIPT_FOOTER_MAX} characters or fewer.`
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
        if (patch.grading) {
          await api.put("/settings/grading", {
            bands: sortedBands(patch.grading.bands).map((band) => ({
              min: band.min,
              grade: band.grade.trim(),
            })),
          })
        }
        if (patch.receipt) {
          await api.put("/settings/receipt", {
            footerNote: patch.receipt.footerNote.trim(),
            showSignatureLine: patch.receipt.showSignatureLine,
          })
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

  const value = useMemo<SchoolContextValue>(
    () => ({
      state,
      syncPortalForRoute,
      ensureAdmissionWizardData,
      reloadSlices,
      persistApplicationDraft,
      patchApplicationRecord,
      finalizeApplication,
      setApplicationStatus,
      saveAttendance,
      saveTestSchedule,
      removeTestSchedule,
      updateSettings,
    }),
    [
      state,
      syncPortalForRoute,
      ensureAdmissionWizardData,
      reloadSlices,
      persistApplicationDraft,
      patchApplicationRecord,
      finalizeApplication,
      setApplicationStatus,
      saveAttendance,
      saveTestSchedule,
      removeTestSchedule,
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
