import { describe, expect, it } from "vitest"

import type { PromotionAction } from "@/api/students/promotions.service"
import type { AcademicSession, ClassSection } from "@/data/types"

import { historyToCsv } from "./history-csv"
import {
  buildPromoteRequest,
  countPlan,
  defaultTargetSession,
  suggestRepeatClass,
  suggestTargetClass,
  validatePlan,
} from "./promotion-plan"

const klass = (id: string, grade: string, section = "Main"): ClassSection => ({
  id, grade, section, label: grade, room: "", periodCount: 8, monthlyFee: 0,
})
const session = (id: string, start: string, current = false): AcademicSession => ({ id, name: id, start, end: start, current })

describe("promotion plan", () => {
  it("defaults to the session after the current one, else the current", () => {
    expect(defaultTargetSession([session("b", "2027-04-01"), session("a", "2026-04-01", true)])?.id).toBe("b")
    expect(defaultTargetSession([session("a", "2026-04-01", true)])?.id).toBe("a")
  })

  it("suggests the next grade, keeping the section, and nothing at the top grade", () => {
    const classes = [klass("1", "KG"), klass("2", "PREP"), klass("3", "Grade 1"), klass("8a", "Grade 8", "A"), klass("9a", "Grade 9", "A"), klass("9b", "Grade 9", "B")]
    expect(suggestTargetClass(classes[0], classes)?.id).toBe("2")
    expect(suggestTargetClass(classes[1], classes)?.id).toBe("3")
    expect(suggestTargetClass(klass("8b", "Grade 8", "B"), classes)?.id).toBe("9b")
    expect(suggestTargetClass(classes[5], classes)).toBeUndefined()
  })

  it("finds the same grade and section for held-back students in a new session", () => {
    const next = [klass("n3", "Grade 3", "B"), klass("n3a", "Grade 3", "A")]
    expect(suggestRepeatClass(klass("3a", "Grade 3", "A"), next)?.id).toBe("n3a")
  })

  it("validates and builds the request", () => {
    const actions = new Map<number, PromotionAction>([[1, "promote"], [2, "hold"], [3, "graduate"]])
    const input = {
      sourceClassId: "5", targetClassId: "6", targetSessionId: "1", date: "2027-03-31",
      graduationResult: "", selected: [1, 2, 3], actions,
    }
    expect(countPlan(input.selected, actions)).toEqual({ promote: 1, hold: 1, graduate: 1 })
    expect(validatePlan(input, true)).toEqual({ graduationResult: expect.any(String) })
    expect(validatePlan({ ...input, graduationResult: "Pass" }, false)).toEqual({ holdClass: expect.any(String) })
    expect(validatePlan({ ...input, targetClassId: "5", graduationResult: "Pass" }, true).targetClass).toMatch(/different/)
    expect(validatePlan({ ...input, selected: [] }, true).students).toBeDefined()

    expect(buildPromoteRequest({ ...input, graduationResult: " Pass ", holdClassId: "9" }, true)).toEqual({
      fromClassId: 5, toClassId: 6, holdClassId: null, sessionId: 1, date: "2027-03-31", graduationResult: "Pass",
      students: [{ studentId: 1, action: "promote" }, { studentId: 2, action: "hold" }, { studentId: 3, action: "graduate" }],
    })
  })

  it("only needs a target class when someone is promoted", () => {
    const actions = new Map<number, PromotionAction>([[1, "graduate"]])
    const input = { sourceClassId: "16", targetSessionId: "1", date: "2027-03-31", graduationResult: "Pass", selected: [1], actions }
    expect(validatePlan(input, true)).toEqual({})
    expect(buildPromoteRequest(input, true).toClassId).toBeNull()
  })

  it("exports history as quoted CSV", () => {
    const csv = historyToCsv([{
      id: "promotion-1", date: "2027-03-31", type: "Promotion", student: { id: 1, name: 'Ali "AK" Khan', admissionNo: "CLS-1" },
      fromClass: "Grade 1", toClass: "Grade 2", session: "2026–27", recordedBy: "Admin",
    }])
    expect(csv.split("\n")[1]).toBe('"2027-03-31","Ali ""AK"" Khan","CLS-1","Grade 1","Grade 2","2026–27","Promotion","Admin"')
  })
})
