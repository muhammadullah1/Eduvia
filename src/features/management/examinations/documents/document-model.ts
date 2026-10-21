import type {
  DmcDocument,
  ExamDocument,
  ExamDocumentMeta,
  ExamResults,
  OverallDocument,
  ResultRow,
  ResultsDocument,
} from "@/api/exams/exams.service"

/**
 * One printable layout shared by the on-screen preview and the PDF, so the
 * two can never drift apart.
 */
export type DocColumn = {
  key: string
  label: string
  align?: "left" | "center" | "right"
  /** Relative width; columns without one share the remainder equally. */
  flex?: number
}

export type DocTable = {
  heading?: string
  caption?: string
  columns: DocColumn[]
  rows: Record<string, string>[]
}

export type DocFact = { label: string; value: string }

export type PrintableDocument = {
  title: string
  schoolName: string
  filename: string
  landscape: boolean
  provisional: boolean
  facts: DocFact[]
  tables: DocTable[]
  summary: DocFact[]
  signatures: string[]
  generatedAt: string
}

const DASH = "—"
const SIGNATURES = ["Class teacher", "Examination controller", "Principal"]

function show(value: string | number | null | undefined) {
  return value == null || value === "" ? DASH : String(value)
}

function percent(value: number | null | undefined) {
  return value == null ? DASH : `${value.toFixed(2)}%`
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function formatDocDate(value: string | null | undefined) {
  if (!value) return DASH
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function examDates(meta: ExamDocumentMeta) {
  const { startDate, endDate } = meta.exam
  if (!startDate) return DASH
  if (!endDate || endDate === startDate) return formatDocDate(startDate)
  return `${formatDocDate(startDate)} – ${formatDocDate(endDate)}`
}

function baseFacts(meta: ExamDocumentMeta, className?: string | null): DocFact[] {
  return [
    { label: "Examination", value: `${meta.exam.name} (${meta.exam.examType})` },
    { label: "Session", value: show(meta.session) },
    { label: "Class", value: show(className) },
    { label: "Exam dates", value: examDates(meta) },
  ]
}

function common(doc: ExamDocument, landscape = false) {
  return {
    schoolName: doc.meta.school.name,
    landscape,
    signatures: SIGNATURES,
    generatedAt: doc.meta.generatedAt,
  }
}

function paperCell(obtained: number | null, status: string) {
  if (status === "Absent") return "Abs"
  if (status === "Exempt") return "Ex"
  if (status === "Pending") return DASH
  return show(obtained)
}

/** Rows in rank order; unranked students (pending or exempt) go last by name. */
function byRank(rows: ResultRow[]) {
  return rows.slice().sort((a, b) => {
    const rank = (a.classRank ?? Infinity) - (b.classRank ?? Infinity)
    return rank || a.name.localeCompare(b.name)
  })
}

function standingTable(data: ExamResults, heading?: string): DocTable {
  return {
    heading,
    columns: [
      { key: "rank", label: "Rank", align: "center", flex: 0.6 },
      { key: "admissionNo", label: "Adm. no", flex: 1 },
      { key: "name", label: "Student", flex: 2.2 },
      { key: "marks", label: "Marks", align: "right", flex: 1.1 },
      { key: "percentage", label: "%", align: "right", flex: 0.9 },
      { key: "grade", label: "Grade", align: "center", flex: 0.7 },
      { key: "result", label: "Result", align: "center", flex: 0.9 },
    ],
    rows: byRank(data.rows).map((row) => ({
      rank: show(row.classRank),
      admissionNo: row.admissionNo,
      name: row.name,
      marks: `${show(row.obtained)} / ${row.total}`,
      percentage: percent(row.percentage),
      grade: show(row.grade),
      result: row.result,
    })),
  }
}

function classSummary(data: ExamResults): DocFact[] {
  const decided = data.rows.filter((row) => row.result === "Pass" || row.result === "Fail")
  const passed = decided.filter((row) => row.result === "Pass").length
  const scored = data.rows.filter((row) => row.percentage != null)
  const average = scored.length
    ? scored.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / scored.length
    : null
  return [
    { label: "Students", value: String(data.rows.length) },
    { label: "Passed", value: String(passed) },
    { label: "Failed", value: String(decided.length - passed) },
    { label: "Pass rate", value: decided.length ? percent((passed / decided.length) * 100) : DASH },
    { label: "Class average", value: percent(average) },
  ]
}

function fromDmc(doc: DmcDocument): PrintableDocument {
  const { student } = doc
  return {
    ...common(doc),
    title: "Detailed Marks Certificate",
    filename: `dmc-${slug(student.name)}-${slug(doc.meta.exam.name)}.pdf`,
    provisional: doc.provisional,
    facts: [
      { label: "Student", value: student.name },
      { label: "Admission no", value: student.admissionNo },
      { label: "Guardian", value: show(student.guardian) },
      { label: "Date of birth", value: formatDocDate(student.dateOfBirth) },
      ...baseFacts(doc.meta, student.className),
    ],
    tables: [
      {
        columns: [
          { key: "subject", label: "Subject", flex: 2.4 },
          { key: "max", label: "Total", align: "right" },
          { key: "passing", label: "Passing", align: "right" },
          { key: "score", label: "Obtained", align: "right" },
          { key: "result", label: "Result", align: "center" },
          { key: "grade", label: "Grade", align: "center" },
        ],
        rows: doc.subjects.map((paper) => ({
          subject: paper.subject,
          max: String(paper.max),
          passing: String(paper.passing),
          score: paper.absent ? "Absent" : paper.exempt ? "Exempt" : show(paper.score),
          result: paper.result,
          grade: show(paper.grade),
        })),
      },
    ],
    summary: [
      { label: "Total", value: `${doc.total} / ${doc.max}` },
      { label: "Percentage", value: percent(doc.percentage) },
      { label: "Grade", value: show(doc.grade) },
      { label: "Result", value: doc.result },
      {
        label: "Class rank",
        value: doc.classRank ? `${doc.classRank} of ${doc.classSize}` : DASH,
      },
    ],
  }
}

function fromResultSheet(doc: ResultsDocument): PrintableDocument {
  return {
    ...common(doc, doc.papers.length > 4),
    title: "Result Sheet",
    filename: `result-sheet-${slug(doc.classLabel ?? "class")}-${slug(doc.meta.exam.name)}.pdf`,
    provisional: Boolean(doc.provisional),
    facts: baseFacts(doc.meta, doc.classLabel),
    tables: [
      {
        columns: [
          { key: "rank", label: "Rank", align: "center", flex: 0.6 },
          { key: "name", label: "Student", flex: 2 },
          ...doc.papers.map((paper) => ({
            key: `p${paper.subjectId}`,
            label: `${paper.subject} (${paper.totalMarks})`,
            align: "center" as const,
          })),
          { key: "marks", label: "Total", align: "right", flex: 1.1 },
          { key: "percentage", label: "%", align: "right", flex: 0.9 },
          { key: "grade", label: "Grade", align: "center", flex: 0.7 },
          { key: "result", label: "Result", align: "center", flex: 0.8 },
        ],
        rows: byRank(doc.rows).map((row) => ({
          rank: show(row.classRank),
          name: `${row.name}\n${row.admissionNo}`,
          ...Object.fromEntries(
            row.papers.map((cell) => [`p${cell.subjectId}`, paperCell(cell.obtained, cell.status)])
          ),
          marks: `${show(row.obtained)} / ${row.total}`,
          percentage: percent(row.percentage),
          grade: show(row.grade),
          result: row.result,
        })),
      },
    ],
    summary: classSummary(doc),
  }
}

function fromMarkSheet(doc: ResultsDocument): PrintableDocument {
  const paper = doc.papers[0]
  const stats = doc.paperStats?.[0]
  return {
    ...common(doc),
    title: "Mark Sheet",
    filename: `mark-sheet-${slug(doc.classLabel ?? "class")}-${slug(paper?.subject ?? "subject")}.pdf`,
    provisional: Boolean(doc.provisional),
    facts: [
      ...baseFacts(doc.meta, doc.classLabel),
      { label: "Subject", value: show(paper?.subject) },
      { label: "Marks", value: paper ? `Total ${paper.totalMarks} · Passing ${paper.passingMarks}` : DASH },
    ],
    tables: [
      {
        columns: [
          { key: "index", label: "#", align: "center", flex: 0.5 },
          { key: "admissionNo", label: "Adm. no", flex: 1.1 },
          { key: "name", label: "Student", flex: 2.4 },
          { key: "obtained", label: "Obtained", align: "right" },
          { key: "grade", label: "Grade", align: "center", flex: 0.8 },
          { key: "result", label: "Result", align: "center" },
          { key: "remarks", label: "Remarks", flex: 1.4 },
        ],
        rows: doc.rows.map((row, index) => {
          const cell = row.papers[0]
          return {
            index: String(index + 1),
            admissionNo: row.admissionNo,
            name: row.name,
            obtained: cell ? paperCell(cell.obtained, cell.status) : DASH,
            grade: show(cell?.grade),
            result: cell?.status ?? DASH,
            remarks: "",
          }
        }),
      },
    ],
    summary: stats
      ? [
          { label: "Appeared", value: String(stats.sat) },
          { label: "Passed", value: String(stats.passed) },
          { label: "Failed", value: String(stats.failed) },
          { label: "Highest", value: show(stats.highest) },
          { label: "Average", value: show(stats.average) },
        ]
      : [],
  }
}

function fromClassReport(doc: ResultsDocument): PrintableDocument {
  return {
    ...common(doc),
    title: "Class Result Report",
    filename: `class-report-${slug(doc.classLabel ?? "class")}-${slug(doc.meta.exam.name)}.pdf`,
    provisional: Boolean(doc.provisional),
    facts: baseFacts(doc.meta, doc.classLabel),
    tables: [
      {
        heading: "Subject performance",
        columns: [
          { key: "subject", label: "Subject", flex: 2 },
          { key: "total", label: "Total", align: "right", flex: 0.8 },
          { key: "sat", label: "Appeared", align: "right" },
          { key: "passed", label: "Passed", align: "right" },
          { key: "failed", label: "Failed", align: "right" },
          { key: "highest", label: "Highest", align: "right" },
          { key: "lowest", label: "Lowest", align: "right" },
          { key: "average", label: "Average", align: "right" },
        ],
        rows: (doc.paperStats ?? []).map((stats) => ({
          subject: stats.subject,
          total: show(doc.papers.find((paper) => paper.subjectId === stats.subjectId)?.totalMarks),
          sat: String(stats.sat),
          passed: String(stats.passed),
          failed: String(stats.failed),
          highest: show(stats.highest),
          lowest: show(stats.lowest),
          average: show(stats.average),
        })),
      },
      standingTable(doc, "Class standing"),
    ],
    summary: classSummary(doc),
  }
}

function fromOverall(doc: OverallDocument): PrintableDocument {
  const rows = doc.classes.flatMap((block) => block.rows)
  const decided = rows.filter((row) => row.result === "Pass" || row.result === "Fail")
  const passed = decided.filter((row) => row.result === "Pass").length
  return {
    ...common(doc),
    title: "Overall Examination Report",
    filename: `overall-report-${slug(doc.meta.exam.name)}.pdf`,
    provisional: doc.classes.some((block) => block.provisional),
    facts: baseFacts(doc.meta, `${doc.classes.length} classes`),
    tables: doc.classes.map((block) => {
      const table = standingTable(block, block.classLabel ?? "Class")
      const summary = classSummary(block)
      return {
        ...table,
        caption: summary.map((fact) => `${fact.label}: ${fact.value}`).join("   ·   "),
      }
    }),
    summary: [
      { label: "Classes", value: String(doc.classes.length) },
      { label: "Students", value: String(rows.length) },
      { label: "Passed", value: String(passed) },
      { label: "Failed", value: String(decided.length - passed) },
      { label: "Pass rate", value: decided.length ? percent((passed / decided.length) * 100) : DASH },
    ],
  }
}

export function toPrintable(doc: ExamDocument): PrintableDocument {
  switch (doc.kind) {
    case "dmc":
      return fromDmc(doc)
    case "overall":
      return fromOverall(doc)
    case "mark-sheet":
      return fromMarkSheet(doc)
    case "class-report":
      return fromClassReport(doc)
    default:
      return fromResultSheet(doc)
  }
}
