import {
  CAMPUS_ADVANCES,
  FEE_TARGET,
  HEADLINE_ACTIVE,
  HEADLINE_AWAITING_REVIEW,
  HEADLINE_ENROLLED_MONTH,
  HEADLINE_OPEN_APPLICATIONS,
  HEADLINE_OVERDUE,
  instructionalDays,
  MONTHLY_EXPENSES,
  SEPTEMBER_COLLECTION_BASELINE,
  SESSION_TODAY,
} from "@/data/session"
import type {
  Admission,
  AttendanceMark,
  AttendanceStatus,
  FeeCharge,
  Lesson,
  MarkSheet,
  Receipt,
  SchoolState,
  SchoolUpdate,
  Student,
} from "@/types"

const students: Student[] = [
  {
    id: "CLS-24118",
    name: "Rayan Ahmed",
    className: "Grade 7 · Blue",
    rollNo: "07",
    guardian: "Faisal Ahmed",
    parentName: "Sara Ahmed",
    status: "Active",
  },
  {
    id: "CLS-24122",
    name: "Ayaan Malik",
    className: "Grade 7 · Blue",
    rollNo: "01",
    guardian: "Sadia Malik",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24131",
    name: "Hania Qureshi",
    className: "Grade 7 · Blue",
    rollNo: "04",
    guardian: "Nadia Qureshi",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24132",
    name: "Bilal Hussain",
    className: "Grade 7 · Blue",
    rollNo: "11",
    guardian: "Imran Hussain",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24133",
    name: "Esha Tariq",
    className: "Grade 7 · Blue",
    rollNo: "15",
    guardian: "Tariq Jamil",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24134",
    name: "Omar Farooq",
    className: "Grade 7 · Blue",
    rollNo: "19",
    guardian: "Farooq Azam",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24120",
    name: "Hamza Noor",
    className: "Grade 8 · Blue",
    rollNo: "18",
    guardian: "Rabia Noor",
    parentName: null,
    status: "Pending",
  },
  {
    id: "CLS-24135",
    name: "Sana Iqbal",
    className: "Grade 8 · Blue",
    rollNo: "02",
    guardian: "Iqbal Ahmed",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24136",
    name: "Yusuf Khan",
    className: "Grade 8 · Blue",
    rollNo: "08",
    guardian: "Kamran Khan",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24137",
    name: "Laiba Shah",
    className: "Grade 8 · Blue",
    rollNo: "14",
    guardian: "Shahid Ali",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24138",
    name: "Ibrahim Noor",
    className: "Grade 7 · Green",
    rollNo: "06",
    guardian: "Noor Hassan",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24139",
    name: "Meher Ali",
    className: "Grade 7 · Green",
    rollNo: "10",
    guardian: "Ali Raza",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24140",
    name: "Hassan Raza",
    className: "Grade 6 · Red",
    rollNo: "03",
    guardian: "Raza Mehmood",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24141",
    name: "Anaya Gul",
    className: "Grade 6 · Red",
    rollNo: "09",
    guardian: "Gulzar Ahmed",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24119",
    name: "Zoya Khan",
    className: "Grade 6 · Green",
    rollNo: "12",
    guardian: "Umer Khan",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24121",
    name: "Maira Ali",
    className: "Grade 5 · Red",
    rollNo: "03",
    guardian: "Kamran Ali",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24130",
    name: "Maya Ahmed",
    className: "Grade 3 · Green",
    rollNo: "05",
    guardian: "Faisal Ahmed",
    parentName: "Sara Ahmed",
    status: "Active",
  },
  {
    id: "CLS-24123",
    name: "Hiba Raza",
    className: "Grade 4 · Green",
    rollNo: "09",
    guardian: "Adeel Raza",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24125",
    name: "Noor Fatima",
    className: "Grade 3 · Blue",
    rollNo: "06",
    guardian: "Ali Fatima",
    parentName: null,
    status: "Active",
  },
  {
    id: "CLS-24124",
    name: "Ibrahim Shah",
    className: "Grade 9 · Red",
    rollNo: "16",
    guardian: "Kiran Shah",
    parentName: null,
    status: "Inactive",
  },
]

const admissions: Admission[] = [
  {
    id: "ADM-26047",
    name: "Eman Siddiqui",
    dob: "2016-04-12",
    applyingFor: "Grade 5",
    guardian: "Fahad Siddiqui",
    notes: "Birth certificate and previous report card attached.",
    status: "New",
    appliedOn: "2026-09-21",
  },
  {
    id: "ADM-26046",
    name: "Saad Saleem",
    dob: "2013-11-02",
    applyingFor: "Grade 8",
    guardian: "Mina Saleem",
    notes: "Transfer certificate pending.",
    status: "Review",
    appliedOn: "2026-09-20",
  },
  {
    id: "ADM-26045",
    name: "Rida Hassan",
    dob: "2019-01-19",
    applyingFor: "Grade 3",
    guardian: "Hassan Rauf",
    notes: "Interview scheduled.",
    status: "Review",
    appliedOn: "2026-09-20",
  },
  {
    id: "ADM-26044",
    name: "Muhammad Zain",
    dob: "2014-06-08",
    applyingFor: "Grade 7",
    guardian: "Amina Zain",
    notes: "Documents complete. Ready to enroll.",
    status: "Approved",
    appliedOn: "2026-09-19",
  },
  {
    id: "ADM-26043",
    name: "Fariha Aslam",
    dob: "2017-08-30",
    applyingFor: "Grade 5",
    guardian: "Aslam Butt",
    notes: "Two documents still missing.",
    status: "Review",
    appliedOn: "2026-09-18",
  },
  {
    id: "ADM-26042",
    name: "Haris Imran",
    dob: "2012-02-14",
    applyingFor: "Grade 9",
    guardian: "Imran Qureshi",
    notes: "No seat in the requested section.",
    status: "Rejected",
    appliedOn: "2026-09-17",
  },
]

function charge(
  studentId: string,
  period: string,
  type: string,
  amount: number,
  due: string
): FeeCharge {
  return {
    id: `CHG-${studentId}-${period.slice(0, 3).toUpperCase()}-${type.slice(0, 3).toUpperCase()}`,
    studentId,
    period,
    type,
    amount,
    due,
  }
}

function receipt(
  id: string,
  student: Student,
  period: string,
  type: string,
  amount: number,
  paidOn: string,
  method = "Cash"
): Receipt {
  return {
    id,
    studentId: student.id,
    studentName: student.name,
    period,
    type,
    amount,
    method,
    paidOn,
    source: "desk",
  }
}

function buildFees(roster: Student[]) {
  const charges: FeeCharge[] = []
  const receipts: Receipt[] = []
  const byId = new Map(roster.map((student) => [student.id, student]))
  const rayan = byId.get("CLS-24118")!

  const rayanMonths: Array<[string, string, string]> = [
    ["April 2026", "2026-04-06", "RCPT-0426-142"],
    ["May 2026", "2026-05-05", "RCPT-0526-188"],
    ["June 2026", "2026-06-04", "RCPT-0626-210"],
    ["July 2026", "2026-07-07", "RCPT-0726-294"],
    ["August 2026", "2026-08-04", "RCPT-0826-377"],
  ]
  for (const [period, paidOn, id] of rayanMonths) {
    charges.push(charge(rayan.id, period, "Tuition", 8500, paidOn))
    receipts.push(receipt(id, rayan, period, "Tuition", 8500, paidOn))
  }

  const unpaidTuition = new Set(["CLS-24119", "CLS-24130", "CLS-24124"])
  for (const student of roster) {
    if (student.status === "Pending") continue
    charges.push(
      charge(student.id, "September 2026", "Tuition", 8500, "2026-09-10")
    )
    if (!unpaidTuition.has(student.id)) {
      const reference =
        student.id === "CLS-24118"
          ? "RCPT-0926-482"
          : `RCPT-0926-${student.id.slice(-3)}`
      receipts.push(
        receipt(
          reference,
          student,
          "September 2026",
          "Tuition",
          8500,
          "2026-09-05"
        )
      )
    }
  }
  charges.push(
    charge("CLS-24124", "August 2026", "Tuition", 8500, "2026-08-10")
  )
  charges.push(
    charge("CLS-24121", "September 2026", "Transport", 3000, "2026-09-10")
  )
  charges.push(
    charge("CLS-24122", "September 2026", "Transport", 3000, "2026-09-10")
  )
  receipts.push(
    receipt(
      "RCPT-0926-481",
      byId.get("CLS-24121")!,
      "September 2026",
      "Transport",
      3000,
      "2026-09-05",
      "Bank transfer"
    )
  )

  return { charges, receipts }
}

function buildAttendance(roster: Student[]): AttendanceMark[] {
  const days = instructionalDays(SESSION_TODAY)
  const marks: AttendanceMark[] = []
  const groups: Array<{
    className: string
    skipToday?: boolean
    overrides?: Record<string, Record<string, AttendanceStatus>>
  }> = [
    {
      className: "Grade 7 · Blue",
      overrides: {
        "CLS-24118": { "2026-09-09": "Absent", "2026-09-15": "Leave" },
      },
    },
    { className: "Grade 8 · Blue", skipToday: true },
    { className: "Grade 7 · Green" },
    { className: "Grade 6 · Red" },
    {
      className: "Grade 3 · Green",
      overrides: {
        "CLS-24130": { "2026-09-02": "Absent", "2026-09-16": "Absent" },
      },
    },
  ]
  for (const group of groups) {
    const classStudents = roster.filter(
      (student) =>
        student.className === group.className && student.status === "Active"
    )
    for (const iso of days) {
      if (group.skipToday && iso === SESSION_TODAY) continue
      for (const student of classStudents) {
        const status = group.overrides?.[student.id]?.[iso] ?? "Present"
        marks.push({
          studentId: student.id,
          className: group.className,
          date: iso,
          status,
        })
      }
    }
  }
  return marks
}

const lessons: Lesson[] = [
  {
    id: "LS-1",
    className: "Grade 7 · Blue",
    subject: "Mathematics",
    title: "Algebraic expressions",
    targetDate: "2026-09-17",
    progress: 100,
  },
  {
    id: "LS-2",
    className: "Grade 7 · Blue",
    subject: "Mathematics",
    title: "Linear equations",
    targetDate: "2026-09-21",
    progress: 88,
  },
  {
    id: "LS-3",
    className: "Grade 7 · Blue",
    subject: "Mathematics",
    title: "Ratio and proportion",
    targetDate: "2026-09-28",
    progress: 52,
  },
  {
    id: "LS-4",
    className: "Grade 7 · Blue",
    subject: "Mathematics",
    title: "Geometry fundamentals",
    targetDate: "2026-10-05",
    progress: 32,
  },
  {
    id: "LS-5",
    className: "Grade 8 · Blue",
    subject: "Mathematics",
    title: "Factorisation",
    targetDate: "2026-09-18",
    progress: 90,
  },
  {
    id: "LS-6",
    className: "Grade 8 · Blue",
    subject: "Mathematics",
    title: "Simultaneous equations",
    targetDate: "2026-09-29",
    progress: 58,
  },
  {
    id: "LS-7",
    className: "Grade 7 · Green",
    subject: "Mathematics",
    title: "Integers review",
    targetDate: "2026-09-16",
    progress: 80,
  },
  {
    id: "LS-8",
    className: "Grade 7 · Green",
    subject: "Mathematics",
    title: "Linear equations",
    targetDate: "2026-09-30",
    progress: 42,
  },
  {
    id: "LS-9",
    className: "Grade 6 · Red",
    subject: "General Science",
    title: "Living organisms",
    targetDate: "2026-09-15",
    progress: 100,
  },
  {
    id: "LS-10",
    className: "Grade 6 · Red",
    subject: "General Science",
    title: "Forces and motion",
    targetDate: "2026-09-29",
    progress: 64,
  },
]

const updates: SchoolUpdate[] = [
  {
    id: "UP-104",
    type: "Homework",
    className: "Grade 7 · Blue",
    subject: "Mathematics",
    text: "Practice exercise 4.2, questions 1–8.",
    due: "2026-09-23",
    status: "Published",
    author: "Hassan Ali",
  },
  {
    id: "UP-103",
    type: "Notice",
    className: "All classes",
    subject: "School office",
    text: "Parent-teacher meeting is scheduled this Saturday.",
    due: "2026-09-26",
    status: "Published",
    author: "Ayesha Khan",
  },
  {
    id: "UP-102",
    type: "Classwork",
    className: "Grade 7 · Blue",
    subject: "General Science",
    text: "Completed chapter 6 laboratory activity.",
    due: "2026-09-21",
    status: "Published",
    author: "Mariam Khan",
  },
  {
    id: "UP-101",
    type: "Homework",
    className: "Grade 7 · Blue",
    subject: "English",
    text: "Prepare a short talk on environmental responsibility.",
    due: "2026-09-25",
    status: "Published",
    author: "Sana Noor",
  },
  {
    id: "UP-100",
    type: "Homework",
    className: "Grade 8 · Blue",
    subject: "Mathematics",
    text: "Bring a geometry set tomorrow.",
    due: "2026-09-25",
    status: "Pending",
    author: "Hassan Ali",
  },
  {
    id: "UP-099",
    type: "Homework",
    className: "Grade 3 · Green",
    subject: "English",
    text: "Read page 12 aloud with a family member.",
    due: "2026-09-25",
    status: "Published",
    author: "Hira Ahmed",
  },
  {
    id: "UP-098",
    type: "Notice",
    className: "Grade 7 · Green",
    subject: "Mathematics",
    text: "Quiz moved to Thursday.",
    due: "2026-09-24",
    status: "Draft",
    author: "Hassan Ali",
  },
]

const augustScores: Record<string, Record<string, number>> = {
  English: {
    "CLS-24118": 84,
    "CLS-24122": 92,
    "CLS-24131": 90,
    "CLS-24132": 78,
    "CLS-24133": 88,
    "CLS-24134": 72,
  },
  Mathematics: {
    "CLS-24118": 94,
    "CLS-24122": 95,
    "CLS-24131": 93,
    "CLS-24132": 82,
    "CLS-24133": 90,
    "CLS-24134": 75,
  },
  "General Science": {
    "CLS-24118": 88,
    "CLS-24122": 90,
    "CLS-24131": 91,
    "CLS-24132": 80,
    "CLS-24133": 89,
    "CLS-24134": 70,
  },
  Urdu: {
    "CLS-24118": 80,
    "CLS-24122": 88,
    "CLS-24131": 86,
    "CLS-24132": 76,
    "CLS-24133": 85,
    "CLS-24134": 74,
  },
  "Computer Studies": {
    "CLS-24118": 90,
    "CLS-24122": 94,
    "CLS-24131": 92,
    "CLS-24132": 84,
    "CLS-24133": 91,
    "CLS-24134": 80,
  },
}

function entriesFor(
  className: string,
  scores?: Record<string, number>,
  blanks: string[] = []
) {
  return students
    .filter(
      (student) =>
        student.className === className && student.status === "Active"
    )
    .map((student) => ({
      studentId: student.id,
      score: blanks.includes(student.id)
        ? null
        : (scores?.[student.id] ?? null),
    }))
}

function buildSheets(): MarkSheet[] {
  const published = Object.entries(augustScores).map(([subject, scores]) => ({
    id: `MS-AUG-G7B-${subject.slice(0, 3).toUpperCase()}`,
    exam: "Monthly Assessment",
    grade: "Grade 7",
    className: "Grade 7 · Blue",
    subject,
    maxMarks: 100,
    status: "Published" as const,
    teacher: subject === "Mathematics" ? "Hassan Ali" : "Subject teacher",
    entries: entriesFor("Grade 7 · Blue", scores),
  }))
  return [
    ...published,
    {
      id: "MS-MT-G7B-MTH",
      exam: "Mid-term 2026",
      grade: "Grade 7",
      className: "Grade 7 · Blue",
      subject: "Mathematics",
      maxMarks: 100,
      status: "Draft",
      teacher: "Hassan Ali",
      entries: entriesFor(
        "Grade 7 · Blue",
        { "CLS-24118": 94, "CLS-24122": 91, "CLS-24131": 88, "CLS-24133": 81 },
        ["CLS-24132", "CLS-24134"]
      ),
    },
    {
      id: "MS-MT-G7B-ENG",
      exam: "Mid-term 2026",
      grade: "Grade 7",
      className: "Grade 7 · Blue",
      subject: "English",
      maxMarks: 100,
      status: "Submitted",
      teacher: "Sana Noor",
      entries: entriesFor("Grade 7 · Blue", {
        "CLS-24118": 86,
        "CLS-24122": 90,
        "CLS-24131": 84,
        "CLS-24132": 79,
        "CLS-24133": 88,
        "CLS-24134": 73,
      }),
    },
    {
      id: "MS-MT-G6R-SCI",
      exam: "Mid-term 2026",
      grade: "Grade 6",
      className: "Grade 6 · Red",
      subject: "General Science",
      maxMarks: 50,
      status: "Draft",
      teacher: "Hassan Ali",
      entries: entriesFor("Grade 6 · Red", { "CLS-24140": 41 }, ["CLS-24141"]),
    },
    {
      id: "MS-AUG-G8B-MTH",
      exam: "Monthly Assessment",
      grade: "Grade 8",
      className: "Grade 8 · Blue",
      subject: "Mathematics",
      maxMarks: 100,
      status: "Published",
      teacher: "Hassan Ali",
      entries: entriesFor("Grade 8 · Blue", {
        "CLS-24135": 81,
        "CLS-24136": 76,
        "CLS-24137": 88,
      }),
    },
    {
      id: "MS-CT-G3G-ENG",
      exam: "Class Test",
      grade: "Grade 3",
      className: "Grade 3 · Green",
      subject: "English",
      maxMarks: 50,
      status: "Published",
      teacher: "Hira Ahmed",
      entries: entriesFor("Grade 3 · Green", { "CLS-24130": 39 }),
    },
  ]
}

function sumAmounts(rows: Array<{ amount: number }>) {
  return rows.reduce((total, row) => total + row.amount, 0)
}

export function campusRollup(
  state: Pick<SchoolState, "students" | "admissions" | "receipts" | "charges">
) {
  const activeNamed = state.students.filter(
    (student) => student.status === "Active"
  ).length
  const openNamed = state.admissions.filter(
    (item) =>
      item.status === "New" ||
      item.status === "Review" ||
      item.status === "Approved"
  ).length
  const awaitingNamed = state.admissions.filter(
    (item) => item.status === "New" || item.status === "Review"
  ).length
  const enrolledNamed = state.admissions.filter(
    (item) => item.status === "Enrolled"
  ).length
  const septemberNamed = sumAmounts(
    state.receipts.filter((item) => item.period === "September 2026")
  )
  const overdueNamed = state.students.filter(
    (student) => studentBalance(state, student.id).outstanding > 0
  ).length
  return {
    activeStudents:
      HEADLINE_ACTIVE -
      students.filter((student) => student.status === "Active").length +
      activeNamed,
    openApplications:
      HEADLINE_OPEN_APPLICATIONS -
      admissions.filter((item) =>
        ["New", "Review", "Approved"].includes(item.status)
      ).length +
      openNamed,
    awaitingReview:
      HEADLINE_AWAITING_REVIEW -
      admissions.filter(
        (item) => item.status === "New" || item.status === "Review"
      ).length +
      awaitingNamed,
    enrolledThisMonth: HEADLINE_ENROLLED_MONTH + enrolledNamed,
    septemberCollected:
      SEPTEMBER_COLLECTION_BASELINE -
      sumAmounts(
        buildFees(students).receipts.filter(
          (item) => item.period === "September 2026"
        )
      ) +
      septemberNamed,
    overdueAccounts: HEADLINE_OVERDUE - initialOverdueCount() + overdueNamed,
    feeTarget: FEE_TARGET,
    expenses: MONTHLY_EXPENSES,
    advances: CAMPUS_ADVANCES + namedAdvances(state),
  }
}

function studentBalance(
  state: Pick<SchoolState, "charges" | "receipts">,
  studentId: string
) {
  const billed = sumAmounts(
    state.charges.filter((item) => item.studentId === studentId)
  )
  const paid = sumAmounts(
    state.receipts.filter((item) => item.studentId === studentId)
  )
  return {
    billed,
    paid,
    outstanding: Math.max(0, billed - paid),
    advance: Math.max(0, paid - billed),
  }
}

function namedAdvances(
  state: Pick<SchoolState, "students" | "charges" | "receipts">
) {
  return state.students.reduce(
    (total, student) => total + studentBalance(state, student.id).advance,
    0
  )
}

function initialOverdueCount() {
  const fees = buildFees(students)
  return students.filter(
    (student) => studentBalance(fees, student.id).outstanding > 0
  ).length
}

export function createSchoolState(now = Date.now()): SchoolState {
  const fees = buildFees(students)
  const receiptIds = fees.receipts.map((item) => item.id)
  const duplicateReceipt = receiptIds.find(
    (id, index) => receiptIds.indexOf(id) !== index
  )
  if (duplicateReceipt) {
    throw new Error(`Duplicate seed receipt ${duplicateReceipt}`)
  }
  const ago = (ms: number) => new Date(now - ms).toISOString()
  return {
    students: students.map((student) => ({ ...student })),
    admissions: admissions.map((item) => ({ ...item })),
    receipts: fees.receipts.map((item) => ({ ...item })),
    charges: fees.charges.map((item) => ({ ...item })),
    attendance: buildAttendance(students),
    lessons: lessons.map((item) => ({ ...item })),
    updates: updates.map((item) => ({ ...item })),
    markSheets: buildSheets(),
    audit: [
      {
        id: "AUD-5812",
        actor: "Ayesha Khan",
        action: "Published Grade 8 Monthly Assessment mathematics",
        at: ago(2 * 60_000),
      },
      {
        id: "AUD-5811",
        actor: "Hassan Ali",
        action: "Saved a draft of Grade 7 · Blue mathematics marks",
        at: ago(18 * 60_000),
      },
      {
        id: "AUD-5810",
        actor: "Sana Noor",
        action: "Submitted Grade 7 · Blue English marks",
        at: ago(26 * 60_000),
      },
      {
        id: "AUD-5809",
        actor: "System",
        action: "Blocked duplicate receipt RCPT-0926-417",
        at: ago(43 * 60_000),
      },
      {
        id: "AUD-5808",
        actor: "Exam Office",
        action: "Reopened Grade 6 English mark sheet",
        at: ago(60 * 60_000),
      },
    ],
    counters: { admission: 26047, student: 24141, update: 104, audit: 5812 },
  }
}

export function timetableFor(className: string) {
  if (className.startsWith("Grade 3")) {
    return [
      ["08:30", "English", "Mathematics", "Urdu", "English", "Art"],
      ["09:15", "Mathematics", "English", "Mathematics", "Urdu", "English"],
      ["10:00", "Story time", "Art", "English", "Mathematics", "Games"],
    ]
  }
  return [
    ["08:00", "English", "Mathematics", "Science", "Urdu", "Computer"],
    ["08:45", "Mathematics", "Science", "English", "Computer", "Urdu"],
    ["09:30", "Science", "English", "Mathematics", "Social Studies", "English"],
    ["11:15", "Computer", "Urdu", "Social Studies", "Mathematics", "Science"],
    ["12:00", "Urdu", "Computer", "English", "Science", "Mathematics"],
  ]
}

export { studentBalance }
