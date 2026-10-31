import { describe, expect, test } from "vitest"

import { missingApiUrlError } from "../../build-config/env-check"

describe("missingApiUrlError (vite build guard)", () => {
  test("production and staging builds fail without VITE_API_URL", () => {
    expect(missingApiUrlError("build", "production", undefined)).toMatch(
      /VITE_API_URL is required/
    )
    expect(missingApiUrlError("build", "staging", "  ")).toMatch(
      /VITE_API_URL is required/
    )
  })

  test("accepts an https API URL or a same-origin path", () => {
    expect(
      missingApiUrlError("build", "production", "https://api.example.com/api")
    ).toBeNull()
    expect(missingApiUrlError("build", "staging", "/api")).toBeNull()
  })

  test("rejects plain http URLs in deployed builds", () => {
    expect(
      missingApiUrlError("build", "production", "http://api.example.com/api")
    ).toMatch(/https/)
  })

  test("dev server and development/test builds keep the /api fallback", () => {
    expect(missingApiUrlError("serve", "production", undefined)).toBeNull()
    expect(missingApiUrlError("build", "development", undefined)).toBeNull()
    expect(missingApiUrlError("build", "test", undefined)).toBeNull()
  })
})
