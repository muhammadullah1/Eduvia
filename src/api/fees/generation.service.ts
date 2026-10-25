import type { CreditEntry } from "@/api/fees/collect.service"
import { api } from "@/lib/api"

export type BillType = "Tuition" | "Admission" | "Exam" | "Annual" | "Transport" | "Other"

/** One class in a generation preview or result. Money fields are absent for roles without `fees.totals`. */
export type GenerationClass = {
  classId: number | null
  label: string
  students: number
  billedStudents: number
  skippedStudents: number
  bills: number
  totalDue?: number
  outstandingCarried?: number
  byType: Partial<Record<BillType, { bills: number; amount?: number }>>
  sampleStudentId: number | null
}

export type GenerationTotals = Omit<GenerationClass, "classId" | "label" | "byType" | "sampleStudentId">

export type GenerationResult = {
  month: string
  label: string
  classId: number | null
  dryRun: boolean
  students: number
  classes: GenerationClass[]
  totals: GenerationTotals
  /** True when the server withheld school-wide money totals (Accountant). */
  amountsHidden?: boolean
}

export type LedgerBill = {
  id: number
  feeType: BillType
  due: number
  paid: number
  outstanding: number
  status: string
  dueDate: string | null
}

export type LedgerMonth = {
  month: string
  label: string
  due: number
  paid: number
  outstanding: number
  status: string
  bills: LedgerBill[]
}

export type StudentLedger = {
  student: {
    id: number
    name: string
    admissionNo: string
    status: string
    class: { id: number; label: string } | null
  }
  months: LedgerMonth[]
  summary: {
    totalDue: number
    totalPaid: number
    outstanding: number
    creditBalance: number
    netBalance: number
    openMonths: number
  }
  /** Every credit movement, newest first (Finance Step 5). */
  creditHistory?: CreditEntry[]
}

export type GenerationInput = { month: string; classId?: number }

export const GENERATION_QUERY_KEY = "fee-generation"
export const LEDGER_QUERY_KEY = "student-ledger"

const generationService = {
  preview: (input: GenerationInput) => api.post<GenerationResult>("/fees/months/preview", input),
  generate: (input: GenerationInput) => api.post<GenerationResult>("/fees/months/generate", input),
  ledger: (studentId: number) => api.get<StudentLedger>(`/fees/students/${studentId}/ledger`),
}

export default generationService
