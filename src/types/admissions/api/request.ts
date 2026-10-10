export type ListApplicationsRequest = {
  status?: "New" | "Review" | "Waitlist" | "Enrolled" | "Rejected"
  q?: string
  submitted?: "true" | "false"
  hasInterview?: "true" | "false"
  page?: number
  pageSize?: number
}

export type ApplicationDocumentInput = {
  id?: number
  label: string
  status: "Pending" | "Uploaded" | "Verified" | "Rejected"
  fileUrl?: string | null
}

export type UpsertApplicationBody = {
  name?: string
  fkClassId?: number
  guardian?: string
  phone?: string
  email?: string
  dob?: string
  gender?: "Male" | "Female" | "Other"
  address?: string
  previousSchool?: string
  previousClass?: string
  guardianRelation?: string
  guardianAddress?: string
  interviewType?: string
  interviewDate?: string | null
  interviewScore?: string
  interviewResult?: string
  decision?: "Admit" | "Reject" | "Waitlist"
  notes?: string
  documents?: ApplicationDocumentInput[]
}

export type DecideApplicationRequest = {
  decision: "Admit" | "Reject" | "Waitlist"
  remarks?: string
}
