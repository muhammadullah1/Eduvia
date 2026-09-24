/** School day the demo treats as "today" so attendance stays aligned across roles. */
export const SESSION_TODAY = "2026-09-24"

export const FEE_TARGET = 8_200_000
export const SEPTEMBER_COLLECTION_BASELINE = 6_800_000
export const MONTHLY_EXPENSES = 4_180_000
export const CAMPUS_ADVANCES = 684_000
export const HEADLINE_ACTIVE = 1_248
export const HEADLINE_OPEN_APPLICATIONS = 47
export const HEADLINE_AWAITING_REVIEW = 12
export const HEADLINE_ENROLLED_MONTH = 28
export const HEADLINE_OVERDUE = 18

export const TEACHER_NAME = "Hassan Ali"
export const PARENT_NAME = "Sara Ahmed"
export const MANAGEMENT_NAME = "Ayesha Khan"

export const TEACHER_CLASSES = [
  {
    className: "Grade 7 · Blue",
    subject: "Mathematics",
    room: "Room 14",
    time: "08:00",
  },
  {
    className: "Grade 8 · Blue",
    subject: "Mathematics",
    room: "Room 18",
    time: "09:30",
  },
  {
    className: "Grade 7 · Green",
    subject: "Mathematics",
    room: "Room 11",
    time: "11:15",
  },
  {
    className: "Grade 6 · Red",
    subject: "General Science",
    room: "Lab 02",
    time: "12:45",
  },
] as const

export const GRADE_OPTIONS = [
  "Grade 3",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
]
export const FEE_PERIODS = ["September 2026", "October 2026", "August 2026"]
export const FEE_TYPES = ["Tuition", "Transport", "Admission"]
export const PAYMENT_METHODS = ["Cash", "Bank transfer"]

export function septemberDates(throughDay = 30) {
  const dates: string[] = []
  for (let day = 1; day <= throughDay; day += 1) {
    dates.push(`2026-09-${String(day).padStart(2, "0")}`)
  }
  return dates
}

export function instructionalDays(through = SESSION_TODAY) {
  return septemberDates(Number(through.slice(-2))).filter((iso) => {
    const day = new Date(`${iso}T12:00:00Z`).getUTCDay()
    return day !== 0 && day !== 6
  })
}

export const SAMPLE_FEE_CSV = `reference,studentId,period,type,amount
RCPT-0926-510,CLS-24119,September 2026,Tuition,8500
RCPT-0926-511,CLS-24130,September 2026,Tuition,8500
RCPT-0926-512,CLS-24122,September 2026,Transport,3000
RCPT-0926-482,CLS-24118,September 2026,Tuition,8500
RCPT-0926-513,CLS-00000,September 2026,Tuition,8500
RCPT-0926-514,CLS-24120,September 2026,Tuition,8500
RCPT-0926-515,CLS-24123,September 2026,Tuition,0
RCPT-0926-516,CLS-24135,September 2026,Tuition,8500
`
