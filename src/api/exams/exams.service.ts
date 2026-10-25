import { api } from "@/lib/api"

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

export type ExamGateStatus = {
  exam: { id: number; name: string; feeMonth: string | null }
  feeRule: string
  publishedSheets: number
  totalSheets: number
  rows: {
    student: { id: number; firstName: string; lastName: string; admissionNo: string | null }
    feeCleared: boolean
    visibleToParent: boolean
  }[]
}

export type ExamClassRef = { id: number; label: string }

export type ExamSheetSummary = {
  id: number
  classId: number
  subjectId: number
  subject: string
  status: "Draft" | "Submitted" | "Verified" | "Published"
  totalMarks: number
  passingMarks: number
  paperDate: string | null
  startTime: string | null
  endTime: string | null
  entered: number
  students: number
}

export type ExamPhase = "upcoming" | "ongoing" | "past"

export type ExamSummary = {
  id: number
  name: string
  examType: ExamType | string
  sessionId: number
  sessionName: string
  startDate: string | null
  endDate: string | null
  status: ExamStatus
  /** Lifecycle from the API: decides what can still be edited, deleted or archived. */
  phase: ExamPhase
  feeMonth: string | null
  classes: ExamClassRef[]
  sheets: ExamSheetSummary[]
}

export type ExamSummaryResponse = {
  session: { id: number; name: string; isCurrent: boolean } | null
  exams: ExamSummary[]
}

export type ExamPaperInput = {
  classId: number
  subjectId: number
  totalMarks: number
  passingMarks: number
  paperDate: string | null
  startTime: string | null
  endTime: string | null
}

export type ClassPaperSubject = {
  id: number
  name: string
  totalMarks: number
  passingMarks: number
}

export type ClassPapers = {
  classId: number
  label: string
  subjects: ClassPaperSubject[]
}

export type ScheduleExamBody = {
  name: string
  examType: ExamType
  sessionId: number
  startDate: string
  endDate: string
  papers: ExamPaperInput[]
  rememberDefaults?: boolean
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

export type PaperStatus = "Pass" | "Fail" | "Absent" | "Exempt" | "Pending"

export type ResultPaperCell = {
  subjectId: number
  obtained: number | null
  status: PaperStatus
  grade?: string | null
}

export type ResultRow = {
  studentId: number
  name: string
  admissionNo: string
  obtained: number | null
  total: number
  percentage: number | null
  grade: string | null
  result: PaperStatus
  failedPapers: number
  papers: ResultPaperCell[]
  classRank: number | null
  visibility: "visible" | "hidden" | "override"
  overrideId: number | null
}

export type ResultPaper = {
  sheetId: number
  subjectId: number
  subject: string
  totalMarks: number
  passingMarks: number
  status: ExamSheetSummary["status"]
}

export type ExamResults = {
  exam: { id: number; name: string; status: ExamStatus; examType: string }
  classId: number
  classLabel: string | null
  subject: string | null
  papers: ResultPaper[]
  totalMarks: number
  sheetStatus: string | null
  rankTie: "shared" | "dense"
  feeRule: string
  provisional?: boolean
  paperStats?: PaperStats[]
  rows: ResultRow[]
}

export type PaperStats = {
  subjectId: number
  subject: string
  sat: number
  passed: number
  failed: number
  absent: number
  exempt: number
  highest: number | null
  lowest: number | null
  average: number | null
}

export type ExamDocumentKind =
  | "dmc"
  | "result-sheet"
  | "mark-sheet"
  | "class-report"
  | "overall"

export type ExamDocumentMeta = {
  school: { name: string }
  session: string | null
  exam: {
    id: number
    name: string
    examType: string
    status: ExamStatus
    startDate: string | null
    endDate: string | null
  }
  generatedAt: string
}

type DocumentBase = { kind: ExamDocumentKind; title: string; meta: ExamDocumentMeta }

export type DmcDocument = DocumentBase & {
  kind: "dmc"
  student: {
    id: number
    name: string
    admissionNo: string
    className: string | null
    guardian: string | null
    dateOfBirth: string | null
    gender: string | null
  }
  subjects: {
    subject: string
    score: number | null
    max: number
    passing: number
    absent: boolean
    exempt: boolean
    result: PaperStatus
    grade: string | null
  }[]
  total: number
  max: number
  percentage: number | null
  grade: string | null
  result: PaperStatus
  passed: boolean
  classRank: number | null
  classSize: number
  provisional: boolean
}

export type ResultsDocument = DocumentBase &
  ExamResults & { kind: "result-sheet" | "mark-sheet" | "class-report" }

export type OverallDocument = DocumentBase & { kind: "overall"; classes: ExamResults[] }

export type ExamDocument = DmcDocument | ResultsDocument | OverallDocument

export type ExamDocumentQuery = {
  classId?: number
  subjectId?: number
  studentId?: number
}

export type DailyTestResultDto = {
  fkStudentId: number
  obtainedMarks: number | string | null
  isAbsent?: boolean
}

export type DailyTestDto = {
  id: number
  date: string
  month: string
  weekOfMonth?: number
  title?: string
  status: string
  /** Stored as `totalMarks`; older payloads used `maxScore`. */
  totalMarks?: number | string
  maxScore?: number | string
  fkClassId: number
  fkSubjectId: number
  class?: { id: number; label: string } | null
  subject?: { id: number; name: string } | null
  results?: DailyTestResultDto[]
}

export type DailyTestMark = {
  studentId: number
  score: number | null
  absent?: boolean
}

export type DailyTestOutcome = {
  status: string
  testsTaken: number
  failedCount: number
  flaggedForFollowUp: boolean
}

export type DailyMonthlySummary = {
  rules: { passPercent: number; maxFailsPerMonth: number }
  tests: { id: number; date: string; weekOfMonth: number; status: string; maxScore: number }[]
  students: {
    student: { id: number; firstName: string; lastName: string; admissionNo: string }
    scores: (number | null)[]
    absent: boolean[]
    summary: DailyTestOutcome | null
  }[]
}

export type ParentSubjectMonth = {
  subject: { id: number; name: string } | null
  tests: {
    id: number
    date: string
    weekOfMonth: number
    maxScore: number
    score: number | null
    absent: boolean
    passed: boolean | null
  }[]
  outcome: DailyTestOutcome & { passedCount: number; averagePercent: number | null }
}

export type DailyFlaggedRow = DailyTestOutcome & {
  id: number
  month: string
  student?: { id: number; firstName: string; lastName: string; admissionNo: string } | null
  subject?: { id: number; name: string } | null
  class?: { id: number; label: string } | null
}

export const dailyTestOutOf = (test: Pick<DailyTestDto, "totalMarks" | "maxScore">) =>
  Number(test.totalMarks ?? test.maxScore ?? 0)

const examsService = {
  summaries: (sessionId?: number) =>
    api.get<ExamSummaryResponse>("/exams", {
      view: "summary",
      sessionId,
    }),

  classPapers: (classIds: number[]) =>
    api.get<ClassPapers[]>("/exams/papers", { classIds: classIds.join(",") }),

  create: (body: ScheduleExamBody) => api.post<unknown>("/exams", body),

  remove: (id: number) => api.delete<{ id: number }>(`/exams/${id}`),

  archive: (id: number) => api.post<unknown>(`/exams/${id}/archive`, {}),

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

  document: <T extends ExamDocument = ExamDocument>(
    examId: number,
    kind: ExamDocumentKind,
    query: ExamDocumentQuery = {}
  ) => api.get<T>(`/exams/${examId}/documents/${kind}`, query),

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

  /** Per-student result gate: a yes/no fee-cleared flag only, never amounts. */
  gateStatus: (examId: number) => api.get<ExamGateStatus>(`/exams/${examId}/visibility`),

  updateVisibility: (body: { feeRule?: string; rankTie?: "shared" | "dense" }) =>
    api.put<unknown>("/settings/resultVisibility", body),

  dailyTests: (month: string) =>
    api.get<DailyTestDto[]>("/daily-tests", { month }),

  dailyTest: (id: number) => api.get<DailyTestDto>(`/daily-tests/${id}`),

  generateDailyTests: (month: string) =>
    api.post<DailyTestDto[]>("/daily-tests/generate", { month }),

  saveDailyMarks: (id: number, marks: DailyTestMark[]) =>
    api.put<DailyTestDto>(`/daily-tests/${id}/marks`, { marks }),

  publishDailyTest: (id: number) =>
    api.post<DailyTestDto>(`/daily-tests/${id}/publish`, {}),

  dailyMonthlySummary: (classId: number, subjectId: number, month: string) =>
    api.get<DailyMonthlySummary>("/daily-tests/monthly-summary", { classId, subjectId, month }),

  childMonthlySummary: (studentId: number, month: string) =>
    api.get<ParentSubjectMonth[]>("/daily-tests/monthly-summary", { studentId, month }),

  dailyFlagged: (month: string) =>
    api.get<DailyFlaggedRow[]>("/daily-tests/flagged", { month }),
}

export default examsService
