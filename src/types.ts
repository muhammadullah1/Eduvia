import type { ComponentType } from "react"

export type Role = "management" | "teacher" | "parent"
export type IconType = ComponentType<{ className?: string }>
export type RecordValue = string | number | boolean
export type DataRecord = Record<string, RecordValue>

export type NavItem = {
  id: string
  label: string
  icon: IconType
  group?: string
}

export type Student = {
  id: string
  name: string
  className: string
  rollNo: string
  guardian: string
  phone: string
  joined: string
  status: "Active" | "Pending" | "Inactive" | "Graduated" | "Struck off"
  balance: number
  attendance: number
}

export type Admission = {
  id: string
  name: string
  applyingFor: string
  guardian: string
  appliedOn: string
  documents: string
  status: "New" | "Review" | "Interview" | "Approved" | "Rejected"
}

export type Teacher = {
  id: string
  name: string
  subject: string
  classes: string
  phone: string
  joined: string
  status: "Active" | "On leave" | "Inactive"
}

export type FeeRecord = {
  id: string
  student: string
  period: string
  type: string
  amount: number
  paid: number
  due: string
  method: string
  status: "Paid" | "Partial" | "Overdue" | "Unpaid" | "Advance"
}

export type Exam = {
  id: string
  name: string
  className: string
  startDate: string
  subjects: string
  progress: number
  status: "Draft" | "Marks in progress" | "Verification" | "Published"
}

export type UpdatePost = {
  id: string
  type: "Homework" | "Classwork" | "Notice"
  className: string
  subject: string
  text: string
  due: string
  status: "Draft" | "Approved" | "Published"
}

