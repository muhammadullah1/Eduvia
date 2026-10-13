import { describe, expect, it } from "vitest"

import { mapApplicationDto } from "@/api/admissions/map-application"
import type { ApplicationDto } from "@/types/admissions/api/response"

const sample: ApplicationDto = {
  id: 12,
  name: "Hassan Ali",
  fkClassId: 3,
  fkSessionId: 1,
  guardian: "Fatima",
  phone: "03001234567",
  email: "parent@test.local",
  dob: "2016-03-10",
  gender: "Male",
  address: "Street",
  previousSchool: null,
  previousClass: null,
  guardianRelation: "Mother",
  guardianAddress: null,
  interviewType: null,
  interviewDate: null,
  interviewScore: null,
  interviewResult: null,
  decision: null,
  status: "New",
  submittedOn: null,
  notes: null,
  enrolledStudentId: null,
  documents: [{ id: 1, label: "Birth", status: "Pending", fileUrl: null }],
}

describe("mapApplicationDto", () => {
  it("maps API DTO to UI application model", () => {
    const app = mapApplicationDto(sample)
    expect(app.id).toBe("APP-12")
    expect(app.name).toBe("Hassan Ali")
    expect(app.classId).toBe("3")
    expect(app.submittedOn).toBe("")
    expect(app.documents[0].id).toBe("1")
  })
})
