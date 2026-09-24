import { createContext, useContext } from "react"

import type {
  ActionResult,
  AdmissionInput,
  AttendanceInput,
  MarkEntry,
  PaymentInput,
  SchoolState,
  SyncRow,
  UpdateInput,
} from "@/types"

export type SchoolApi = {
  state: SchoolState
  reset: () => void
  createAdmission: (input: AdmissionInput, actor: string) => ActionResult
  decideAdmission: (
    id: string,
    decision: "enroll" | "reject",
    actor: string
  ) => ActionResult
  activateStudent: (id: string, actor: string) => ActionResult
  recordPayment: (input: PaymentInput, actor: string) => ActionResult
  importReceipts: (rows: SyncRow[], actor: string) => ActionResult
  saveAttendance: (input: AttendanceInput, actor: string) => ActionResult
  updateLesson: (id: string, progress: number, actor: string) => ActionResult
  submitUpdate: (input: UpdateInput, actor: string) => ActionResult
  resubmitUpdate: (id: string, actor: string) => ActionResult
  setUpdateStatus: (
    id: string,
    status: "Published" | "Draft",
    actor: string
  ) => ActionResult
  saveMarks: (
    sheetId: string,
    entries: MarkEntry[],
    mode: "draft" | "submit",
    actor: string
  ) => ActionResult
  transitionSheet: (
    sheetId: string,
    to: "Verified" | "Published" | "Draft",
    actor: string
  ) => ActionResult
}

export const SchoolContext = createContext<SchoolApi | null>(null)

export function useSchool() {
  const context = useContext(SchoolContext)
  if (!context) throw new Error("useSchool must be used within SchoolProvider")
  return context
}
