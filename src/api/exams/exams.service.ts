import { loadAuth } from "@/lib/auth"
import { api, ApiHttpError } from "@/lib/api"

export const EXAM_TYPES = [
  "Mid-Term",
  "Monthly Test",
  "Final Term",
  "Unit Test",
] as const

export type ExamType = (typeof EXAM_TYPES)[number]

export type ExamStatus =
  | "Draft"
  | "Scheduled"
  | "Marks Pending"
  | "Finalised"
  | "Published"
  | "Archived"

export type ExamClassRef = { id: number; label: string }

export type ExamSheetSummary = {
  id: number
  classId: number
  subjectId: number
  subject: string
  status: "Draft" | "Submitted" | "Verified" | "Published"
  totalMarks: number
  passingMarks: number
  entered: number
  students: number
}

export type ExamSummary = {
  id: number
  name: string
  examType: ExamType | string
  sessionId: number
  sessionName: string
  startDate: string | null
  endDate: string | null
  status: ExamStatus
  totalMarks: number
  passingMarks: number
  feeMonth: string | null
  classes: ExamClassRef[]
  sheets: ExamSheetSummary[]
}

export type ExamSummaryResponse = {
  session: { id: number; name: string; isCurrent: boolean } | null
  exams: ExamSummary[]
}

export type ScheduleExamBody = {
  name: string
  examType: ExamType
  sessionId: number
  startDate: string
  endDate: string
  totalMarks: number
  passingMarks: number
  classIds: number[]
}

export type SheetStudent = {
  id: number
  firstName: string
  lastName: string
  admissionNo: string
}

export type SheetRow = {
  id: number
  fkStudentId: number
  score: number | string | null
  obtainedMarks?: number | string | null
  isAbsent: boolean
  isExempt: boolean
  student?: SheetStudent
}

export type MarkSheetDetail = {
  id: number
  status: ExamSheetSummary["status"]
  totalMarks: number | string
  passingMarks: number | string
  fkClassId: number
  fkSubjectId: number
  rows: SheetRow[]
}

export type ResultRow = {
  studentId: number
  name: string
  admissionNo: string
  obtained: number | null
  total: number
  percentage: number | null
  grade: string | null
  result: string
  classRank: number | null
  subjectRank: number | null
  overallRank: number | null
  visibility: "visible" | "hidden" | "override"
  overrideId: number | null
}

export type ExamResults = {
  exam: { id: number; name: string; status: ExamStatus; examType: string }
  classLabel: string | null
  subject: string | null
  totalMarks: number | null
  sheetStatus: string | null
  rankTie: "shared" | "dense"
  feeRule: string
  rows: ResultRow[]
}

export type DailyTestDto = {
  id: number
  date: string
  status: string
  maxScore: number | string
  class?: { id: number; label: string } | null
  subject?: { id: number; name: string } | null
  results?: { fkStudentId: number; obtainedMarks: number | null }[]
}

const examsService = {
  summaries: (sessionId?: number) =>
    api.get<ExamSummaryResponse>("/exams", {
      view: "summary",
      sessionId,
    }),

  create: (body: ScheduleExamBody) => api.post<unknown>("/exams", body),

  update: (id: number, body: Partial<ScheduleExamBody>) =>
    api.patch<unknown>(`/exams/${id}`, body),

  sheet: (sheetId: number) =>
    api.get<MarkSheetDetail>(`/exams/sheets/${sheetId}`),

  saveRows: (
    sheetId: number,
    rows: { studentId: number; score: number | null; absent: boolean; exempt: boolean }[]
  ) => api.put<MarkSheetDetail>(`/exams/sheets/${sheetId}/rows`, { rows }),

  submitSheet: (sheetId: number) =>
    api.post<MarkSheetDetail>(`/exams/sheets/${sheetId}/submit`, {}),

  reopenSheet: (sheetId: number) =>
    api.post<MarkSheetDetail>(`/exams/sheets/${sheetId}/reopen`, {}),

  results: (examId: number, classId?: number, subjectId?: number) =>
    api.get<ExamResults>(`/exams/${examId}/results`, { classId, subjectId }),

  advance: (examId: number) =>
    api.post<{ action: string }>(`/exams/${examId}/advance`, {}),

  grantOverride: (examId: number, studentId: number, reason: string) =>
    api.post<unknown>(`/exams/${examId}/overrides`, { studentId, reason }),

  revokeOverride: (overrideId: number) =>
    api.delete<unknown>(`/exams/overrides/${overrideId}`),

  bulkOverride: (examId: number, classId: number, reason: string) =>
    api.post<{ granted: number }>(`/exams/${examId}/overrides/bulk`, {
      classId,
      reason,
    }),

  updateVisibility: (body: { feeRule?: string; rankTie?: "shared" | "dense" }) =>
    api.put<unknown>("/settings/resultVisibility", body),

  dailyTests: (month: string) =>
    api.get<DailyTestDto[]>("/daily-tests", { month }),

  async download(path: string, filename: string) {
    const session = loadAuth()
    const res = await fetch(`/api${path}`, {
      headers: {
        Authorization: session?.token ? `Bearer ${session.token}` : "",
        platform: "webApp",
      },
    })
    if (!res.ok) {
      let message = "Could not download the document."
      try {
        const body = (await res.json()) as { message?: string }
        if (body.message) message = body.message
      } catch {
        /* binary error */
      }
      throw new ApiHttpError(res.status, message)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  },
}

export default examsService
