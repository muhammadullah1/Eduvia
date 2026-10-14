import { describe, expect, it } from "vitest"

import {
  mapTimetableSlotDto,
  subjectsFromTimetableSlots,
} from "@/api/timetable/map-timetable"

describe("map-timetable", () => {
  it("maps slot without teacher", () => {
    const slot = mapTimetableSlotDto({
      id: 12,
      fkClassId: 3,
      day: "Monday",
      time: "08:15",
      periodIndex: 2,
      fkSubjectId: 5,
      fkTeacherId: null,
      room: "A-1",
      subject: { id: 5, name: "Math" },
    })
    expect(slot.teacherId).toBe("")
    expect(slot.subject).toBe("Math")
    expect(slot.time).toBe("08:15")
  })

  it("aggregates subjects from class slots", () => {
    const rows = subjectsFromTimetableSlots(
      [
        {
          id: "1",
          classId: "3",
          day: "Monday",
          time: "08:00",
          periodIndex: 1,
          subject: "Math",
          teacherId: "9",
          teacher: "A. Khan",
          room: "R1",
        },
        {
          id: "2",
          classId: "3",
          day: "Tuesday",
          time: "08:00",
          periodIndex: 1,
          subject: "Math",
          teacherId: "",
          teacher: "",
          room: "R1",
        },
      ],
      [{ id: "5", name: "Math", code: "MTH" }]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].periodCount).toBe(2)
    expect(rows[0].code).toBe("MTH")
  })
})
