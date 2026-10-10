import type { PaginationMeta } from "@/types/shared/api/response"

export type ApplicationDocumentDto = {
  id: number
  label: string
  status: string
  fileUrl: string | null
}

export type ApplicationDto = {
  id: number
  name: string
  fkClassId: number | null
  fkSessionId: number
  gradeApplyingFor?: string
  guardian: string
  phone: string
  email: string | null
  dob: string
  gender: string
  address: string | null
  previousSchool: string | null
  previousClass: string | null
  guardianRelation: string | null
  guardianAddress: string | null
  interviewType: string | null
  interviewDate: string | null
  interviewScore: string | null
  interviewResult: string | null
  decision: string | null
  status: string
  submittedOn: string | null
  notes: string | null
  enrolledStudentId: number | null
  documents: ApplicationDocumentDto[]
}

export type ListApplicationsData = {
  applications: ApplicationDto[]
  pagination: PaginationMeta
}

export type EnrollApplicationData = {
  application: ApplicationDto
  student: unknown
}
