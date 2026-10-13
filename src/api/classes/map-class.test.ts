import { describe, expect, it } from "vitest"

import {
  buildClassLabel,
  classDisplayName,
  mapClassDto,
} from "@/api/classes/map-class"

describe("map-class", () => {
  it("maps API dto to ClassSection", () => {
    const mapped = mapClassDto({
      id: 3,
      fkSessionId: 1,
      grade: "Grade 7",
      section: "Blue",
      label: "Grade 7 · Blue",
      room: "B-12",
      periodCount: 8,
      monthlyTuitionFee: 8500,
    })
    expect(mapped.id).toBe("3")
    expect(mapped.monthlyFee).toBe(8500)
  })

  it("builds display names", () => {
    expect(buildClassLabel("Nursery", "Main")).toBe("Nursery")
    expect(buildClassLabel("Grade 7", "Blue")).toBe("Grade 7 · Blue")
    expect(
      classDisplayName({
        id: "1",
        grade: "Nursery",
        section: "Main",
        label: "Nursery",
        room: "",
        periodCount: 8,
        monthlyFee: 0,
      })
    ).toBe("Nursery")
  })
})
