import { campusRollup, studentBalance, timetableFor } from "@/data/seed"
import {
  FEE_TARGET,
  SESSION_TODAY,
  TEACHER_CLASSES,
  TEACHER_NAME,
} from "@/data/session"
import { letterGrade } from "@/lib/format"
import type { MarkSheet, SchoolState, Student } from "@/types"

export function rollup(state: SchoolState) {
  return campusRollup(state)
}

export function balance(state: SchoolState, studentId: string) {
  return studentBalance(state, studentId)
}

export function findStudent(state: SchoolState, studentId: string) {
  return state.students.find((student) => student.id === studentId)
}

export function activeStudents(state: SchoolState) {
  return state.students.filter((student) => student.status === "Active")
}

export function classRoster(state: SchoolState, className: string) {
  return state.students.filter(
    (student) => student.className === className && student.status === "Active"
  )
}

export function parentChildren(state: SchoolState, parentName: string) {
  return state.students.filter((student) => student.parentName === parentName)
}

export function enrollmentSeries(activeStudentsCount: number) {
  return [
    { month: "Apr", students: 1180 },
    { month: "May", students: 1194 },
    { month: "Jun", students: 1205 },
    { month: "Jul", students: 1216 },
    { month: "Aug", students: 1232 },
    { month: "Sep", students: activeStudentsCount },
  ]
}

export function feeSeries(septemberCollected: number) {
  const millions = Math.round((septemberCollected / 1_000_000) * 1000) / 1000
  return [
    { month: "Apr", collection: 7.1, target: FEE_TARGET / 1_000_000 },
    { month: "May", collection: 7.5, target: FEE_TARGET / 1_000_000 },
    { month: "Jun", collection: 6.9, target: FEE_TARGET / 1_000_000 },
    { month: "Jul", collection: 7.8, target: FEE_TARGET / 1_000_000 },
    { month: "Aug", collection: 8.0, target: FEE_TARGET / 1_000_000 },
    { month: "Sep", collection: millions, target: FEE_TARGET / 1_000_000 },
  ]
}

export function latestReceipts(state: SchoolState, limit = 8) {
  return [...state.receipts]
    .sort(
      (a, b) => b.paidOn.localeCompare(a.paidOn) || b.id.localeCompare(a.id)
    )
    .slice(0, limit)
}

export function attendanceFor(state: SchoolState, studentId: string) {
  const marks = state.attendance.filter(
    (mark) => mark.studentId === studentId && mark.date.startsWith("2026-09")
  )
  const present = marks.filter((mark) => mark.status === "Present").length
  const absent = marks.filter((mark) => mark.status === "Absent").length
  const leave = marks.filter((mark) => mark.status === "Leave").length
  const total = marks.length
  return {
    marks,
    present,
    absent,
    leave,
    total,
    rate: total ? (present / total) * 100 : 0,
  }
}

export function todayMarks(state: SchoolState, date = SESSION_TODAY) {
  return state.attendance.filter((mark) => mark.date === date)
}

export function todayAttendanceRate(state: SchoolState) {
  const marks = todayMarks(state)
  const present = marks.filter((mark) => mark.status === "Present").length
  return {
    present,
    absent: marks.filter((mark) => mark.status === "Absent").length,
    total: marks.length,
    rate: marks.length ? (present / marks.length) * 100 : 0,
  }
}

export function unmarkedTeacherClasses(state: SchoolState) {
  return TEACHER_CLASSES.filter(
    (item) =>
      !state.attendance.some(
        (mark) =>
          mark.className === item.className && mark.date === SESSION_TODAY
      )
  )
}

export function syllabusProgress(
  state: SchoolState,
  className: string,
  subject: string
) {
  const lessons = state.lessons.filter(
    (lesson) => lesson.className === className && lesson.subject === subject
  )
  if (!lessons.length) return 0
  return Math.round(
    lessons.reduce((total, lesson) => total + lesson.progress, 0) /
      lessons.length
  )
}

export function lessonLabel(progress: number) {
  if (progress >= 100) return "Completed"
  if (progress <= 0) return "Planned"
  return "In progress"
}

export function teacherSheet(state: SchoolState, className: string) {
  const mine = state.markSheets.filter(
    (sheet) => sheet.className === className && sheet.teacher === TEACHER_NAME
  )
  return (
    mine.find((sheet) => sheet.exam === "Mid-term 2026") ??
    mine.find((sheet) => sheet.status !== "Published") ??
    mine[0]
  )
}

export function examBoards(state: SchoolState) {
  const groups = new Map<string, MarkSheet[]>()
  for (const sheet of state.markSheets) {
    const key = `${sheet.exam}||${sheet.grade}`
    groups.set(key, [...(groups.get(key) ?? []), sheet])
  }
  return [...groups.entries()].map(([key, sheets]) => {
    const [exam, grade] = key.split("||")
    const filled = sheets.reduce(
      (total, sheet) =>
        total + sheet.entries.filter((entry) => entry.score !== null).length,
      0
    )
    const total = sheets.reduce(
      (count, sheet) => count + sheet.entries.length,
      0
    )
    const statuses = new Set(sheets.map((sheet) => sheet.status))
    let status = "Marks in progress"
    if (statuses.size === 1) status = [...statuses][0]
    return {
      exam,
      grade,
      sheets,
      subjects: `${sheets.length} tracked`,
      progress: total ? Math.round((filled / total) * 100) : 0,
      status,
    }
  })
}

export function publishedResults(state: SchoolState, student: Student) {
  const sheets = state.markSheets.filter(
    (sheet) =>
      sheet.status === "Published" && sheet.className === student.className
  )
  const exams = [...new Set(sheets.map((sheet) => sheet.exam))]
  return exams.map((exam) => {
    const examSheets = sheets.filter((sheet) => sheet.exam === exam)
    const rows = examSheets
      .map((sheet) => {
        const score = sheet.entries.find(
          (entry) => entry.studentId === student.id
        )?.score
        if (score === null || score === undefined) return null
        const marked = sheet.entries
          .map((entry) => entry.score)
          .filter((value): value is number => value !== null)
        const average = marked.length
          ? marked.reduce((total, value) => total + value, 0) / marked.length
          : 0
        return {
          subject: sheet.subject,
          score,
          max: sheet.maxMarks,
          average,
          percent: (score / sheet.maxMarks) * 100,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
    const overall = rows.length
      ? rows.reduce((total, row) => total + row.percent, 0) / rows.length
      : 0
    const classmateIds = [
      ...new Set(
        examSheets.flatMap((sheet) =>
          sheet.entries.map((entry) => entry.studentId)
        )
      ),
    ]
    const ranked = classmateIds
      .map((studentId) => {
        const percents = examSheets.flatMap((sheet) => {
          const score = sheet.entries.find(
            (entry) => entry.studentId === studentId
          )?.score
          return score === null || score === undefined
            ? []
            : [(score / sheet.maxMarks) * 100]
        })
        if (percents.length !== examSheets.length) return null
        return {
          studentId,
          overall:
            percents.reduce((total, value) => total + value, 0) /
            percents.length,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.overall - a.overall)
    const rank = ranked.findIndex((row) => row.studentId === student.id) + 1
    return {
      exam,
      className: student.className,
      rows,
      overall,
      rank,
      cohort: ranked.length,
      grade: letterGrade(overall),
    }
  })
}

export function visibleUpdates(state: SchoolState, className: string) {
  return state.updates.filter(
    (update) =>
      update.status === "Published" &&
      (update.className === className || update.className === "All classes")
  )
}

export function homeworkDue(state: SchoolState, className: string) {
  return visibleUpdates(state, className).filter(
    (update) => update.type === "Homework" && update.due >= SESSION_TODAY
  )
}

export function studentTimetable(className: string) {
  return timetableFor(className)
}

export { FEE_TARGET, SESSION_TODAY, TEACHER_CLASSES }
