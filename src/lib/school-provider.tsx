import { useMemo, useState, type ReactNode } from "react"

import { createSchoolState } from "@/data/seed"
import { SchoolContext, type SchoolApi } from "@/lib/school-context"
import {
  applyActivation,
  applyAdmission,
  applyAdmissionDecision,
  applyAttendance,
  applyImport,
  applyLesson,
  applyMarks,
  applyPayment,
  applyResubmit,
  applySheetTransition,
  applyUpdate,
  applyUpdateStatus,
} from "@/lib/school"
import type { ActionResult, SchoolState } from "@/types"

type Commit = <T extends { state: SchoolState; result: ActionResult }>(
  apply: (state: SchoolState) => T
) => ActionResult

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createSchoolState)
  const api = useMemo<SchoolApi>(() => {
    const commit: Commit = (apply) => {
      let result: ActionResult = {
        ok: false,
        error: "Could not save that change.",
      }
      setState((current) => {
        const applied = apply(current)
        result = applied.result
        return applied.result.ok ? applied.state : current
      })
      return result
    }
    return {
      state,
      reset: () => setState(createSchoolState()),
      createAdmission: (input, actor) =>
        commit((current) => applyAdmission(current, input, actor)),
      decideAdmission: (id, decision, actor) =>
        commit((current) =>
          applyAdmissionDecision(current, id, decision, actor)
        ),
      activateStudent: (id, actor) =>
        commit((current) => applyActivation(current, id, actor)),
      recordPayment: (input, actor) =>
        commit((current) => applyPayment(current, input, actor)),
      importReceipts: (rows, actor) =>
        commit((current) => applyImport(current, rows, actor)),
      saveAttendance: (input, actor) =>
        commit((current) => applyAttendance(current, input, actor)),
      updateLesson: (id, progress, actor) =>
        commit((current) => applyLesson(current, id, progress, actor)),
      submitUpdate: (input, actor) =>
        commit((current) => applyUpdate(current, input, actor)),
      resubmitUpdate: (id, actor) =>
        commit((current) => applyResubmit(current, id, actor)),
      setUpdateStatus: (id, status, actor) =>
        commit((current) => applyUpdateStatus(current, id, status, actor)),
      saveMarks: (sheetId, entries, mode, actor) =>
        commit((current) => applyMarks(current, sheetId, entries, mode, actor)),
      transitionSheet: (sheetId, to, actor) =>
        commit((current) => applySheetTransition(current, sheetId, to, actor)),
    }
  }, [state])
  return <SchoolContext.Provider value={api}>{children}</SchoolContext.Provider>
}
