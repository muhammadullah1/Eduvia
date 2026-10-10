import { describe, expect, it } from "vitest"

import {
  applicationIdFromApi,
  applicationNumericId,
  toApplicationApiBody,
} from "@/lib/applications-api"

describe("applications-api helpers", () => {
  it("parses and formats application ids", () => {
    expect(applicationNumericId("APP-42")).toBe(42)
    expect(applicationNumericId("invalid")).toBeNull()
    expect(applicationIdFromApi(7)).toBe("APP-7")
  })

  it("maps wizard payload to API body", () => {
    const body = toApplicationApiBody({
      name: "Ayesha Khan",
      classId: "12",
      guardian: "Parent",
      phone: "03001234567",
      dob: "2016-05-01",
      gender: "Female",
      documents: [
        { id: "3", label: "Birth certificate", status: "Uploaded" },
        { id: "birth", label: "Other", status: "Pending" },
      ],
    })
    expect(body.fkClassId).toBe(12)
    expect(body.name).toBe("Ayesha Khan")
    expect(body.documents).toEqual([
      { id: 3, label: "Birth certificate", status: "Uploaded" },
      { id: undefined, label: "Other", status: "Pending" },
    ])
  })

  it("omits empty interview fields for draft-safe API bodies", () => {
    const body = toApplicationApiBody({
      name: "Test",
      classId: "18",
      interviewType: "Interview",
      interviewDate: "",
      interviewScore: "",
      interviewResult: "",
      notes: "",
    })
    expect(body.interviewDate).toBeNull()
    expect(body.interviewScore).toBeUndefined()
    expect(body.notes).toBeUndefined()
  })
})
