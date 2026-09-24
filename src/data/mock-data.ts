import type { Admission, Exam, FeeRecord, Student, Teacher, UpdatePost } from "@/types"

export const studentsSeed: Student[] = [
  { id: "CLS-24118", name: "Rayan Ahmed", className: "Grade 7 · Blue", rollNo: "07", guardian: "Faisal Ahmed", phone: "+92 300 812 4401", joined: "04 Apr 2024", status: "Active", balance: 0, attendance: 95 },
  { id: "CLS-24119", name: "Zoya Khan", className: "Grade 6 · Green", rollNo: "12", guardian: "Umer Khan", phone: "+92 321 552 1188", joined: "05 Apr 2024", status: "Active", balance: 8500, attendance: 92 },
  { id: "CLS-24120", name: "Hamza Noor", className: "Grade 8 · Blue", rollNo: "18", guardian: "Rabia Noor", phone: "+92 333 446 9002", joined: "07 Apr 2024", status: "Pending", balance: 11500, attendance: 88 },
  { id: "CLS-24121", name: "Maira Ali", className: "Grade 5 · Red", rollNo: "03", guardian: "Kamran Ali", phone: "+92 302 221 7840", joined: "11 Apr 2024", status: "Active", balance: 0, attendance: 97 },
  { id: "CLS-24122", name: "Ayaan Malik", className: "Grade 7 · Blue", rollNo: "01", guardian: "Sadia Malik", phone: "+92 315 790 3354", joined: "13 Apr 2024", status: "Active", balance: 3000, attendance: 94 },
  { id: "CLS-24123", name: "Hiba Raza", className: "Grade 4 · Green", rollNo: "09", guardian: "Adeel Raza", phone: "+92 322 421 8672", joined: "14 Apr 2024", status: "Active", balance: 0, attendance: 91 },
  { id: "CLS-24124", name: "Ibrahim Shah", className: "Grade 9 · Red", rollNo: "16", guardian: "Kiran Shah", phone: "+92 301 780 2215", joined: "15 Apr 2024", status: "Inactive", balance: 17000, attendance: 76 },
  { id: "CLS-24125", name: "Noor Fatima", className: "Grade 3 · Blue", rollNo: "06", guardian: "Ali Fatima", phone: "+92 334 209 4501", joined: "18 Apr 2024", status: "Active", balance: 0, attendance: 98 },
  { id: "CLS-24126", name: "Daniyal Tariq", className: "Grade 10 · Green", rollNo: "11", guardian: "Tariq Mehmood", phone: "+92 300 550 1820", joined: "20 Apr 2024", status: "Active", balance: 8500, attendance: 89 },
  { id: "CLS-24127", name: "Alina Saeed", className: "Grade 2 · Red", rollNo: "04", guardian: "Saeed Anwar", phone: "+92 312 881 0034", joined: "22 Apr 2024", status: "Active", balance: 0, attendance: 96 },
  { id: "CLS-24128", name: "Ahmed Bilal", className: "Grade 8 · Green", rollNo: "20", guardian: "Bilal Ashraf", phone: "+92 330 147 7280", joined: "25 Apr 2024", status: "Struck off", balance: 25500, attendance: 68 },
  { id: "CLS-24129", name: "Maham Javed", className: "Grade 6 · Blue", rollNo: "15", guardian: "Javed Iqbal", phone: "+92 305 645 1021", joined: "27 Apr 2024", status: "Active", balance: 0, attendance: 93 },
]

export const admissionsSeed: Admission[] = [
  { id: "ADM-26047", name: "Eman Siddiqui", applyingFor: "Grade 5", guardian: "Fahad Siddiqui", appliedOn: "21 Sep 2026", documents: "5 / 5", status: "New" },
  { id: "ADM-26046", name: "Saad Saleem", applyingFor: "Grade 8", guardian: "Mina Saleem", appliedOn: "20 Sep 2026", documents: "4 / 5", status: "Review" },
  { id: "ADM-26045", name: "Rida Hassan", applyingFor: "Grade 2", guardian: "Hassan Rauf", appliedOn: "20 Sep 2026", documents: "5 / 5", status: "Interview" },
  { id: "ADM-26044", name: "Muhammad Zain", applyingFor: "Grade 7", guardian: "Amina Zain", appliedOn: "19 Sep 2026", documents: "5 / 5", status: "Approved" },
  { id: "ADM-26043", name: "Fariha Aslam", applyingFor: "Grade 4", guardian: "Aslam Butt", appliedOn: "18 Sep 2026", documents: "3 / 5", status: "Review" },
  { id: "ADM-26042", name: "Haris Imran", applyingFor: "Grade 9", guardian: "Imran Qureshi", appliedOn: "17 Sep 2026", documents: "5 / 5", status: "Rejected" },
]

export const teachersSeed: Teacher[] = [
  { id: "TCH-009", name: "Hassan Ali", subject: "Mathematics", classes: "4 classes", phone: "+92 300 110 4701", joined: "Aug 2021", status: "Active" },
  { id: "TCH-014", name: "Sana Noor", subject: "English", classes: "5 classes", phone: "+92 321 221 7682", joined: "Mar 2022", status: "Active" },
  { id: "TCH-018", name: "Mariam Khan", subject: "General Science", classes: "4 classes", phone: "+92 333 419 0036", joined: "Jul 2023", status: "Active" },
  { id: "TCH-022", name: "Usman Tariq", subject: "Computer Studies", classes: "3 classes", phone: "+92 312 822 5110", joined: "Jan 2024", status: "On leave" },
  { id: "TCH-027", name: "Hira Ahmed", subject: "Urdu", classes: "5 classes", phone: "+92 304 728 9301", joined: "Apr 2024", status: "Active" },
  { id: "TCH-031", name: "Salman Raza", subject: "Social Studies", classes: "3 classes", phone: "+92 330 142 6720", joined: "Aug 2025", status: "Inactive" },
]

export const feeSeed: FeeRecord[] = [
  { id: "RCPT-0926-482", student: "Rayan Ahmed", period: "September 2026", type: "Tuition", amount: 8500, paid: 8500, due: "10 Sep 2026", method: "Cash", status: "Paid" },
  { id: "RCPT-0926-481", student: "Maira Ali", period: "September 2026", type: "Transport", amount: 3000, paid: 3000, due: "10 Sep 2026", method: "Bank", status: "Paid" },
  { id: "INV-0926-480", student: "Zoya Khan", period: "September 2026", type: "Tuition", amount: 8500, paid: 0, due: "10 Sep 2026", method: "—", status: "Overdue" },
  { id: "RCPT-0926-479", student: "Ayaan Malik", period: "September 2026", type: "Tuition + Transport", amount: 11500, paid: 8500, due: "10 Sep 2026", method: "Cash", status: "Partial" },
  { id: "ADV-0926-117", student: "Noor Fatima", period: "October 2026", type: "Tuition", amount: 8500, paid: 8500, due: "10 Oct 2026", method: "Bank", status: "Advance" },
  { id: "INV-0926-478", student: "Ibrahim Shah", period: "August–September", type: "Tuition", amount: 17000, paid: 0, due: "10 Aug 2026", method: "—", status: "Overdue" },
]

export const examsSeed: Exam[] = [
  { id: "EX-2609-01", name: "Mid-term 2026", className: "Grade 7", startDate: "05 Oct 2026", subjects: "8 / 8", progress: 86, status: "Marks in progress" },
  { id: "EX-2608-04", name: "Monthly Assessment", className: "Grade 8", startDate: "22 Aug 2026", subjects: "6 / 6", progress: 100, status: "Published" },
  { id: "EX-2609-02", name: "Mid-term 2026", className: "Grade 6", startDate: "05 Oct 2026", subjects: "7 / 8", progress: 72, status: "Draft" },
  { id: "EX-2609-03", name: "Mid-term 2026", className: "Grade 5", startDate: "06 Oct 2026", subjects: "8 / 8", progress: 94, status: "Verification" },
]

export const updatesSeed: UpdatePost[] = [
  { id: "UP-104", type: "Homework", className: "Grade 7 · Blue", subject: "Mathematics", text: "Practice exercise 4.2, questions 1–8.", due: "23 Sep 2026", status: "Published" },
  { id: "UP-103", type: "Notice", className: "All classes", subject: "School office", text: "Parent-teacher meeting is scheduled this Saturday.", due: "26 Sep 2026", status: "Approved" },
  { id: "UP-102", type: "Classwork", className: "Grade 7 · Blue", subject: "General Science", text: "Completed chapter 6 laboratory activity.", due: "21 Sep 2026", status: "Published" },
  { id: "UP-101", type: "Homework", className: "Grade 8 · Blue", subject: "English", text: "Prepare a short talk on environmental responsibility.", due: "25 Sep 2026", status: "Draft" },
]

export const academicResources = {
  sessions: [
    { id: "SES-2627", name: "2026–27", period: "01 Apr 2026 – 31 Mar 2027", students: 1248, status: "Current" },
    { id: "SES-2526", name: "2025–26", period: "01 Apr 2025 – 31 Mar 2026", students: 1194, status: "Archived" },
    { id: "SES-2425", name: "2024–25", period: "01 Apr 2024 – 31 Mar 2025", students: 1131, status: "Archived" },
  ],
  classes: [
    { id: "CLS-G07", name: "Grade 7", sections: 3, students: 98, classTeacher: "Hassan Ali", status: "Active" },
    { id: "CLS-G08", name: "Grade 8", sections: 3, students: 91, classTeacher: "Mariam Khan", status: "Active" },
    { id: "CLS-G06", name: "Grade 6", sections: 2, students: 67, classTeacher: "Sana Noor", status: "Active" },
    { id: "CLS-G05", name: "Grade 5", sections: 2, students: 64, classTeacher: "Hira Ahmed", status: "Active" },
  ],
  subjects: [
    { id: "SUB-MTH", name: "Mathematics", code: "MTH-07", classes: "Grades 1–10", teachers: 6, status: "Active" },
    { id: "SUB-ENG", name: "English", code: "ENG-07", classes: "Grades 1–10", teachers: 7, status: "Active" },
    { id: "SUB-SCI", name: "General Science", code: "SCI-07", classes: "Grades 4–8", teachers: 5, status: "Active" },
    { id: "SUB-CS", name: "Computer Studies", code: "CS-07", classes: "Grades 3–10", teachers: 4, status: "Active" },
  ],
}

export const timetableRows = [
  { time: "08:00", Monday: "English", Tuesday: "Mathematics", Wednesday: "Science", Thursday: "Urdu", Friday: "Computer" },
  { time: "08:45", Monday: "Mathematics", Tuesday: "Science", Wednesday: "English", Thursday: "Computer", Friday: "Urdu" },
  { time: "09:30", Monday: "Science", Tuesday: "English", Wednesday: "Mathematics", Thursday: "Social Studies", Friday: "English" },
  { time: "11:15", Monday: "Computer", Tuesday: "Urdu", Wednesday: "Social Studies", Thursday: "Mathematics", Friday: "Science" },
  { time: "12:00", Monday: "Urdu", Tuesday: "Computer", Wednesday: "English", Thursday: "Science", Friday: "Mathematics" },
]

export const auditRows = [
  { id: "AUD-5812", actor: "Ayesha Khan", action: "Published Grade 8 Monthly Assessment", module: "Examinations", time: "2 min ago", result: "Success" },
  { id: "AUD-5811", actor: "Hassan Ali", action: "Submitted Grade 7 Mathematics marks", module: "Teacher Portal", time: "18 min ago", result: "Success" },
  { id: "AUD-5810", actor: "Nadia — Fee Desk", action: "Imported 84 offline fee rows", module: "Fee Sync", time: "42 min ago", result: "Success" },
  { id: "AUD-5809", actor: "System", action: "Blocked duplicate receipt RCPT-0926-417", module: "Fee Sync", time: "43 min ago", result: "Blocked" },
  { id: "AUD-5808", actor: "Exam Office", action: "Reopened Grade 6 English mark sheet", module: "Examinations", time: "1 hr ago", result: "Approved" },
]

