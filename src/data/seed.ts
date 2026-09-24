import type {
  AttendanceMark,
  AttendanceStatus,
  ClassSection,
  MarkSheet,
  SchoolState,
  Student,
  TimetableSlot,
} from "@/data/types"

const classes: ClassSection[] = [
  { id: "g7b", label: "Grade 7 · Blue", grade: "Grade 7", section: "Blue", room: "Room 14" },
  { id: "g7g", label: "Grade 7 · Green", grade: "Grade 7", section: "Green", room: "Room 11" },
  { id: "g8b", label: "Grade 8 · Blue", grade: "Grade 8", section: "Blue", room: "Room 18" },
  { id: "g6r", label: "Grade 6 · Red", grade: "Grade 6", section: "Red", room: "Lab 02" },
  { id: "g5r", label: "Grade 5 · Red", grade: "Grade 5", section: "Red", room: "Room 08" },
  { id: "g3y", label: "Grade 3 · Yellow", grade: "Grade 3", section: "Yellow", room: "Room 04" },
]

const roster: Array<[string, string, string, string, Student["gender"], string]> = [
  ["CLS-24118", "Rayan Ahmed", "g7b", "Faisal Ahmed", "Male", "2013-04-12"],
  ["CLS-23014", "Maya Ahmed", "g3y", "Faisal Ahmed", "Female", "2017-08-02"],
  ["CLS-24119", "Zoya Khan", "g6r", "Umer Khan", "Female", "2014-01-19"],
  ["CLS-24120", "Hamza Noor", "g8b", "Rabia Noor", "Male", "2012-11-03"],
  ["CLS-24121", "Maira Ali", "g5r", "Kamran Ali", "Female", "2015-06-22"],
  ["CLS-24122", "Ayaan Malik", "g7b", "Sana Malik", "Male", "2013-02-14"],
  ["CLS-24123", "Hania Raza", "g7b", "Bilal Raza", "Female", "2013-09-01"],
  ["CLS-24124", "Ibrahim Shah", "g7b", "Nadia Shah", "Male", "2013-07-28"],
  ["CLS-24125", "Esha Qureshi", "g7g", "Hira Qureshi", "Female", "2013-03-09"],
  ["CLS-24126", "Saad Iqbal", "g7g", "Nadia Iqbal", "Male", "2013-12-11"],
  ["CLS-24127", "Noor Fatima", "g8b", "Asad Fatima", "Female", "2012-05-17"],
  ["CLS-24128", "Daniyal Hussain", "g8b", "Farah Hussain", "Male", "2012-08-30"],
  ["CLS-24129", "Areeba Siddiqui", "g6r", "Imran Siddiqui", "Female", "2014-04-04"],
  ["CLS-24130", "Yusuf Mirza", "g6r", "Laila Mirza", "Male", "2014-10-21"],
  ["CLS-24131", "Inaya Dar", "g5r", "Omar Dar", "Female", "2015-01-08"],
  ["CLS-24132", "Haris Javed", "g3y", "Saima Javed", "Male", "2017-02-16"],
  ["CLS-24133", "Meher Bukhari", "g8b", "Tariq Bukhari", "Female", "2012-06-06"],
  ["CLS-24134", "Arham Saleem", "g7g", "Kiran Saleem", "Male", "2013-11-25"],
]

function statusFor(studentId: string, date: string): AttendanceStatus {
  const day = Number(date.slice(-2))
  if (studentId === "CLS-24118" && day === 9) return "Absent"
  if (studentId === "CLS-24118" && day === 15) return "Leave"
  if (studentId === "CLS-23014" && day === 8) return "Leave"
  const n = studentId.charCodeAt(studentId.length - 1) + day
  if (n % 19 === 0) return "Absent"
  if (n % 23 === 0) return "Leave"
  return "Present"
}

const schoolDays = [
  "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04",
  "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11",
  "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18",
  "2026-09-21", "2026-09-22", "2026-09-23",
]

function buildStudents(): Student[] {
  return roster.map(([id, name, classId, guardian, gender, dob]) => ({
    id,
    name,
    classId,
    guardian,
    phone: "0300-" + id.slice(-4) + "21",
    status: id === "CLS-24120" ? "Pending" : "Active",
    dob,
    gender,
    admittedOn: id === "CLS-24120" ? "2026-09-18" : "2026-04-01",
  }))
}

function buildAttendance(students: Student[]): AttendanceMark[] {
  return students.flatMap((student) =>
    schoolDays.map((date) => ({
      studentId: student.id,
      classId: student.classId,
      date,
      status: statusFor(student.id, date),
    })),
  )
}

function sheet(id: string, examName: string, classId: string, subject: string, status: MarkSheet["status"], scoreFor: (student: Student, index: number) => number | null, students: Student[]): MarkSheet {
  const rows = students
    .filter((student) => student.classId === classId && student.status !== "Withdrawn")
    .map((student, index) => ({ studentId: student.id, score: scoreFor(student, index) }))
  return { id, examName, classId, subject, status, max: 100, rows }
}

function buildSlots(): TimetableSlot[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  const times = ["08:00", "08:45", "09:30", "11:15", "12:00"]
  const cycle = [
    ["English", "Sana Noor"],
    ["Mathematics", "Hassan Ali"],
    ["General Science", "Mariam Khan"],
    ["Computer Studies", "Bilal Raza"],
    ["Urdu", "Hira Qureshi"],
  ] as const
  const slots: TimetableSlot[] = []
  for (const klass of ["g7b", "g3y", "g8b"] as const) {
    days.forEach((day, dayIndex) => {
      times.forEach((time, timeIndex) => {
        const [subject, teacher] = cycle[(dayIndex + timeIndex) % cycle.length]
        const room = classes.find((item) => item.id === klass)?.room ?? "Room 14"
        slots.push({
          id: `${klass}-${day}-${time}`,
          classId: klass,
          day,
          time,
          subject,
          teacher,
          room,
        })
      })
    })
  }
  slots.push(
    { id: "g7g-mon-math", classId: "g7g", day: "Monday", time: "11:15", subject: "Mathematics", teacher: "Hassan Ali", room: "Room 11" },
    { id: "g6r-mon-sci", classId: "g6r", day: "Monday", time: "12:45", subject: "General Science", teacher: "Hassan Ali", room: "Lab 02" },
  )
  return slots
}

export function createSeed(): SchoolState {
  const students = buildStudents()

  return {
    sessions: [
      { id: "s2026", name: "2026–27", start: "2026-04-01", end: "2027-03-31", current: true },
      { id: "s2025", name: "2025–26", start: "2025-04-01", end: "2026-03-31", current: false },
    ],
    classes,
    subjects: [
      { id: "eng", name: "English", code: "ENG" },
      { id: "math", name: "Mathematics", code: "MTH" },
      { id: "sci", name: "General Science", code: "SCI" },
      { id: "urd", name: "Urdu", code: "URD" },
      { id: "cs", name: "Computer Studies", code: "CS" },
      { id: "sst", name: "Social Studies", code: "SST" },
    ],
    staff: [
      { id: "st-hassan", name: "Hassan Ali", role: "Teacher", email: "hassan@cls.edu.pk", phone: "0301-5550190", subjects: ["Mathematics", "General Science"], classIds: ["g7b", "g8b", "g7g", "g6r"] },
      { id: "st-sana", name: "Sana Noor", role: "Teacher", email: "sana@cls.edu.pk", phone: "0302-5550144", subjects: ["English"], classIds: ["g7b", "g8b"] },
      { id: "st-mariam", name: "Mariam Khan", role: "Teacher", email: "mariam@cls.edu.pk", phone: "0303-5550177", subjects: ["General Science"], classIds: ["g7b", "g6r"] },
      { id: "st-bilal", name: "Bilal Raza", role: "Teacher", email: "bilal@cls.edu.pk", phone: "0304-5550112", subjects: ["Computer Studies"], classIds: ["g7b", "g8b"] },
      { id: "st-nadia", name: "Nadia Iqbal", role: "Accounts", email: "fees@cls.edu.pk", phone: "0305-5550188", subjects: [], classIds: [] },
    ],
    students,
    applications: [
      { id: "APP-1042", name: "Hiba Rehman", classId: "g7b", guardian: "Adeel Rehman", phone: "0321-4402190", dob: "2013-05-02", status: "Review", submittedOn: "2026-09-19", notes: "Birth certificate received. Interview pending." },
      { id: "APP-1043", name: "Zain Abbas", classId: "g8b", guardian: "Farheen Abbas", phone: "0333-2201184", dob: "2012-09-14", status: "New", submittedOn: "2026-09-21", notes: "" },
      { id: "APP-1044", name: "Anaya Sheikh", classId: "g3y", guardian: "Usman Sheikh", phone: "0345-7781200", dob: "2017-01-30", status: "New", submittedOn: "2026-09-22", notes: "Sibling of a current student." },
      { id: "APP-1038", name: "Rohaan Tariq", classId: "g6r", guardian: "Nida Tariq", phone: "0308-6612094", dob: "2014-07-07", status: "Enrolled", submittedOn: "2026-09-02", notes: "Enrolled into Grade 6 · Red." },
      { id: "APP-1031", name: "Mina Dar", classId: "g5r", guardian: "Omar Dar", phone: "0312-9094411", dob: "2015-03-18", status: "Rejected", submittedOn: "2026-08-26", notes: "Section at capacity for this intake." },
    ],
    payments: [
      ...["04", "05", "06", "07", "08"].flatMap((month, monthIndex) =>
        students.slice(0, 8 + monthIndex).map((student, index) => ({
          ref: `RCPT-${month}26-${400 + index}`,
          studentId: student.id,
          period: `${["April", "May", "June", "July", "August"][monthIndex]} 2026`,
          type: "Tuition",
          amount: 8500,
          method: "Cash" as const,
          status: "Paid" as const,
          date: `2026-${month}-${String((index % 27) + 1).padStart(2, "0")}`,
        })),
      ),
      { ref: "RCPT-0926-482", studentId: "CLS-24118", period: "September 2026", type: "Tuition", amount: 8500, method: "Cash", status: "Paid", date: "2026-09-05" },
      { ref: "RCPT-0926-481", studentId: "CLS-24121", period: "September 2026", type: "Transport", amount: 3000, method: "Bank transfer", status: "Paid", date: "2026-09-06" },
      { ref: "RCPT-0926-480", studentId: "CLS-24119", period: "September 2026", type: "Tuition", amount: 8500, method: "Cash", status: "Pending", date: "2026-09-08" },
      { ref: "RCPT-0826-377", studentId: "CLS-24118", period: "August 2026", type: "Tuition", amount: 8500, method: "Cash", status: "Paid", date: "2026-08-04" },
      { ref: "RCPT-0726-294", studentId: "CLS-24118", period: "July 2026", type: "Tuition", amount: 8500, method: "Bank transfer", status: "Paid", date: "2026-07-07" },
      { ref: "RCPT-0926-470", studentId: "CLS-24122", period: "September 2026", type: "Tuition", amount: 8500, method: "Cash", status: "Paid", date: "2026-09-04" },
      { ref: "RCPT-0926-468", studentId: "CLS-24127", period: "September 2026", type: "Tuition", amount: 9000, method: "Bank transfer", status: "Paid", date: "2026-09-03" },
      { ref: "RCPT-0626-210", studentId: "CLS-24123", period: "June 2026", type: "Tuition", amount: 8500, method: "Cash", status: "Paid", date: "2026-06-09" },
      { ref: "RCPT-0526-188", studentId: "CLS-23014", period: "September 2026", type: "Tuition", amount: 7500, method: "Cash", status: "Paid", date: "2026-09-05" },
      { ref: "RCPT-0926-455", studentId: "CLS-24120", period: "September 2026", type: "Admission", amount: 15000, method: "Bank transfer", status: "Pending", date: "2026-09-18" },
    ],
    expenses: [
      { id: "EX-1", title: "September payroll", category: "Payroll", amount: 186000, date: "2026-09-01" },
      { id: "EX-2", title: "Electricity bill", category: "Facilities", amount: 24500, date: "2026-09-12" },
      { id: "EX-3", title: "Lab equipment", category: "Academic supplies", amount: 9600, date: "2026-09-15" },
      { id: "EX-4", title: "Campus transport fuel", category: "Transport", amount: 14600, date: "2026-09-18" },
      { id: "EX-5", title: "Library books", category: "Academic supplies", amount: 4200, date: "2026-09-20" },
    ],
    sheets: [
      sheet("sh-mid-g7b-math", "Mid-term 2026", "g7b", "Mathematics", "Draft", (student) => (student.id === "CLS-24124" ? null : 70 + (student.id.charCodeAt(9) % 25)), students),
      sheet("sh-mid-g8b-math", "Monthly Assessment", "g8b", "Mathematics", "Published", (_student, index) => 74 + ((index * 5) % 18), students),
      sheet("sh-mid-g6r-sci", "Mid-term 2026", "g6r", "General Science", "Draft", () => null, students),
      sheet("sh-aug-g7b-eng", "Monthly Assessment · August 2026", "g7b", "English", "Published", (student) => (student.id === "CLS-24118" ? 86 : 78), students),
      sheet("sh-aug-g7b-math", "Monthly Assessment · August 2026", "g7b", "Mathematics", "Published", (student) => (student.id === "CLS-24118" ? 94 : 76), students),
      sheet("sh-aug-g7b-sci", "Monthly Assessment · August 2026", "g7b", "General Science", "Published", (student) => (student.id === "CLS-24118" ? 89 : 74), students),
      sheet("sh-aug-g7b-urd", "Monthly Assessment · August 2026", "g7b", "Urdu", "Published", (student) => (student.id === "CLS-24118" ? 81 : 72), students),
      sheet("sh-aug-g7b-cs", "Monthly Assessment · August 2026", "g7b", "Computer Studies", "Published", (student) => (student.id === "CLS-24118" ? 92 : 82), students),
      sheet("sh-sub-g7g-math", "Mid-term 2026", "g7g", "Mathematics", "Submitted", (_student, index) => 64 + index * 4, students),
    ],
    attendance: buildAttendance(students),
    lessons: [
      { id: "ls-1", classId: "g7b", subject: "Mathematics", title: "Algebraic expressions", status: "Completed", target: "2026-09-17", progress: 100 },
      { id: "ls-2", classId: "g7b", subject: "Mathematics", title: "Linear equations", status: "In progress", target: "2026-09-21", progress: 72 },
      { id: "ls-3", classId: "g7b", subject: "Mathematics", title: "Ratio and proportion", status: "Planned", target: "2026-09-28", progress: 10 },
      { id: "ls-4", classId: "g7b", subject: "Mathematics", title: "Geometry fundamentals", status: "Planned", target: "2026-10-05", progress: 0 },
      { id: "ls-5", classId: "g8b", subject: "Mathematics", title: "Quadratic equations", status: "In progress", target: "2026-09-24", progress: 40 },
      { id: "ls-6", classId: "g6r", subject: "General Science", title: "Chapter 6 lab activity", status: "Completed", target: "2026-09-16", progress: 100 },
    ],
    updates: [
      { id: "up-1", classId: "g7b", kind: "Homework", subject: "Mathematics", text: "Practice exercise 4.2, questions 1–8.", status: "Published", due: "2026-09-23", author: "Hassan Ali" },
      { id: "up-2", classId: "g8b", kind: "Notice", subject: "Mathematics", text: "Bring a geometry set tomorrow.", status: "Approved", due: "2026-09-24", author: "Hassan Ali" },
      { id: "up-3", classId: "g7g", kind: "Homework", subject: "Mathematics", text: "Quiz moved to Thursday.", status: "Draft", due: "2026-09-25", author: "Hassan Ali" },
      { id: "up-4", classId: "g7b", kind: "Notice", subject: "School office", text: "Parent-teacher meeting is scheduled this Saturday at 10:00.", status: "Published", due: "2026-09-19", author: "Ayesha Khan" },
      { id: "up-5", classId: "g7b", kind: "Classwork", subject: "General Science", text: "Completed chapter 6 laboratory activity.", status: "Published", due: "2026-09-23", author: "Mariam Khan" },
      { id: "up-6", classId: "g7b", kind: "Homework", subject: "English", text: "Prepare a short talk on environmental responsibility.", status: "Published", due: "2026-09-25", author: "Sana Noor" },
      { id: "up-7", classId: "g3y", kind: "Homework", subject: "English", text: "Read the picture story on page 18 with a family member.", status: "Published", due: "2026-09-24", author: "Sana Noor" },
    ],
    slots: buildSlots(),
    audits: [
      { id: "au-1", actor: "Ayesha Khan", action: "Published Grade 8 Monthly Assessment", at: new Date(Date.now() - 2 * 60000).toISOString() },
      { id: "au-2", actor: "Hassan Ali", action: "Submitted Grade 7 Green Mathematics marks", at: new Date(Date.now() - 18 * 60000).toISOString() },
      { id: "au-3", actor: "Nadia Iqbal", action: "Imported 84 offline fee rows", at: new Date(Date.now() - 42 * 60000).toISOString() },
      { id: "au-4", actor: "System", action: "Blocked duplicate receipt RCPT-0926-417", at: new Date(Date.now() - 43 * 60000).toISOString() },
    ],
    syncLogs: [
      { id: "sy-1", fileName: "september-desk.xlsx", imported: 84, skipped: 2, failed: 1, notes: ["Skipped duplicate RCPT-0926-417", "Failed row 19: unknown student"], at: new Date(Date.now() - 42 * 60000).toISOString() },
    ],
  }
}
