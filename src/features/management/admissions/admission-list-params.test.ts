import { describe, expect, it } from "vitest"

import { buildApplicationsListRequest } from "./admission-list-params"
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination"

describe("buildApplicationsListRequest", () => {
  it("defaults page and pageSize from caller", () => {
    expect(
      buildApplicationsListRequest({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        statusFilter: "all",
      })
    ).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE })
  })

  it("maps draft filter to New + not submitted", () => {
    expect(
      buildApplicationsListRequest({
        page: 2,
        pageSize: 10,
        statusFilter: "draft",
      })
    ).toEqual({
      page: 2,
      pageSize: 10,
      status: "New",
      submitted: "false",
    })
  })

  it("maps test_interview to hasInterview", () => {
    expect(
      buildApplicationsListRequest({
        page: 1,
        pageSize: 10,
        q: " ali ",
        statusFilter: "test_interview",
      })
    ).toEqual({
      page: 1,
      pageSize: 10,
      q: "ali",
      hasInterview: "true",
    })
  })
})
